// lib/api/payment.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:24555/api'; 

export const createOrderApi = async (amount: number) => {
  const { data } = await axios.post(`${API_URL}/payments/create-order`, { amount });
  return data;
};

export const verifyPaymentApi = async (paymentData: any) => {
  const { data } = await axios.post(`${API_URL}/payments/verify-payment`, paymentData);
  return data;
};