import jwt from 'jsonwebtoken';

export const generateTokens = (id: string) => {
  // 1. Access Token with 1 Day Expiry
  const accessToken = jwt.sign({ id }, process.env.JWT_SECRET!, {
    expiresIn: '1d', 
  });

  // 2. Refresh Token (usually longer lived, e.g., 7 days)
  const refreshToken = jwt.sign({ id }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: '7d',
  });

  return { accessToken, refreshToken };
};