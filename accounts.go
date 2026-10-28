package main

import (
	"encoding/json"
	"errors"
	"log/slog"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/zalando/go-keyring"
)

const keyringService = "Notice Desktop"

type Account struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type accountRecord struct {
	Email     string `json:"email"`
	Timestamp int64  `json:"timestamp"`
}

type AccountsStore struct {
	mu     sync.Mutex
	path   string
	logger *slog.Logger
}

func NewAccountsStore(logger *slog.Logger) *AccountsStore {
	return &AccountsStore{
		path:   filepath.Join(appDataDir(), "accounts.json"),
		logger: logger,
	}
}

func (a *AccountsStore) GetAll() ([]Account, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	records, err := a.load()
	if err != nil {
		return nil, err
	}

	accounts := make([]Account, 0, len(records))
	for _, record := range records {
		password, err := keyring.Get(keyringService, record.Email)
		if err != nil {
			a.logger.Warn("读取账户密码失败，已跳过", "email", record.Email, "error", err)
			continue
		}
		accounts = append(accounts, Account{Email: record.Email, Password: password})
	}
	return accounts, nil
}

func (a *AccountsStore) Save(account Account) error {
	if account.Email == "" || account.Password == "" {
		return errors.New("邮箱和密码不能为空")
	}
	a.mu.Lock()
	defer a.mu.Unlock()

	if err := keyring.Set(keyringService, account.Email, account.Password); err != nil {
		return err
	}
	records, err := a.load()
	if err != nil {
		return err
	}
	next := make([]accountRecord, 0, len(records)+1)
	replaced := false
	for _, record := range records {
		if record.Email == account.Email {
			next = append(next, accountRecord{Email: account.Email, Timestamp: time.Now().UnixMilli()})
			replaced = true
		} else {
			next = append(next, record)
		}
	}
	if !replaced {
		next = append(next, accountRecord{Email: account.Email, Timestamp: time.Now().UnixMilli()})
	}
	return a.save(next)
}

func (a *AccountsStore) Delete(email string) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	err := keyring.Delete(keyringService, email)
	if err != nil && !errors.Is(err, keyring.ErrNotFound) {
		return err
	}
	records, err := a.load()
	if err != nil {
		return err
	}
	next := make([]accountRecord, 0, len(records))
	for _, record := range records {
		if record.Email != email {
			next = append(next, record)
		}
	}
	return a.save(next)
}

func (a *AccountsStore) load() ([]accountRecord, error) {
	data, err := os.ReadFile(a.path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	var records []accountRecord
	if err := json.Unmarshal(data, &records); err != nil {
		return nil, err
	}
	return records, nil
}

func (a *AccountsStore) save(records []accountRecord) error {
	if err := os.MkdirAll(filepath.Dir(a.path), 0o755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(records, "", "  ")
	if err != nil {
		return err
	}
	tmp, err := os.CreateTemp(filepath.Dir(a.path), ".accounts-*.json")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)
	if _, err := tmp.Write(data); err != nil {
		_ = tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmpName, a.path)
}
