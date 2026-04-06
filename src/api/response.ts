export const isSuccessResponse = (payload: any): boolean => {
  if (typeof payload?.success === 'boolean') {
    return payload.success;
  }

  if (typeof payload?.status === 'string') {
    return payload.status.toUpperCase() === 'SUCCESS';
  }

  return payload?.data !== undefined;
};
