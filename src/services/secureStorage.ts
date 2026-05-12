import * as SecureStore from 'expo-secure-store';

export const saveSecureItem = async (key: string, value: string) => {
  await SecureStore.setItemAsync(key, value);
};

export const getSecureItem = async (key: string) => {
  return await SecureStore.getItemAsync(key);
};

export const deleteSecureItem = async (key: string) => {
  await SecureStore.deleteItemAsync(key);
};
