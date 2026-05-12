import { saveSecureItem, getSecureItem, deleteSecureItem } from './secureStorage';

export const saveSessionData = async (token: string, userId: string) => {
  await saveSecureItem('SESSION_TOKEN', token);
  await saveSecureItem('USER_ID', userId);
};

export const saveFullSession = async (
  token: string,
  userId: string,
  identityId: string,
  deviceId: string,
) => {
  await Promise.all([
    saveSecureItem('SESSION_TOKEN', token),
    saveSecureItem('USER_ID', userId),
    saveSecureItem('IDENTITY_ID', identityId),
    saveSecureItem('DEVICE_ID', deviceId),
  ]);
};

export const getSessionToken = async () => getSecureItem('SESSION_TOKEN');
export const getIdentityId = async () => getSecureItem('IDENTITY_ID');
export const getDeviceId = async () => getSecureItem('DEVICE_ID');
export const getUserId = async () => getSecureItem('USER_ID');

export const clearSession = async () => {
  await Promise.all([
    deleteSecureItem('SESSION_TOKEN'),
    deleteSecureItem('USER_ID'),
    deleteSecureItem('IDENTITY_ID'),
    deleteSecureItem('DEVICE_ID'),
  ]);
};
