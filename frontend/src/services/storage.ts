import { DeleteAccount, GetAccounts, SaveAccount } from '../../bindings/NoticeDesktop/desktopservice'

interface Account {
  email: string
  password: string
}

export const storageService = {
  async getAccounts(): Promise<Account[]> {
    return GetAccounts()
  },

  async saveAccount(account: Account): Promise<void> {
    return SaveAccount(account)
  },

  async deleteAccount(email: string): Promise<void> {
    return DeleteAccount(email)
  }
}
