import { useState } from 'react';
import { useAuth, api } from './../providers/GlobalProvider';
export const useRazorpay = () => {
  const [isLoading, setIsLoading] = useState(false);

  const initiatePayment = async (amount: number, userEmail: string = "user@example.com") => {
    setIsLoading(true);
    try {
      if (!window.Razorpay) {
        alert("Razorpay SDK is not loaded. Please wait a moment.");
        return;
      }

      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!razorpayKey) {
        console.error("Razorpay Key is missing.");
        alert("Payment configuration error.");
        return;
      }

      const { data: createData } = await api.post('/razorpay/payments/create-order', {
        amount, 
      });

      if (!createData.success) {
        throw new Error("Order creation failed");
      }

      const options = {
        key: razorpayKey, 
        amount: createData.order.amount,
        currency: createData.order.currency,
        name: "Labely Store Manager",
        description: "Premium Upgrade",
        order_id: createData.order.id, 
        handler: async function (response: any) {
          try {
            const verifyRes = await api.post('/razorpay/payments/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: amount 
            });

            if (verifyRes.data.success) {
              alert("Payment Successful! Database updated.");
              window.location.reload(); 
            }
          } catch (err) {
            console.error("Verification failed:", err);
            alert("Payment verification failed on server.");
          }
        },
        prefill: {
          email: userEmail,
        },
        theme: {
          color: "#2563EB", 
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();

    } catch (error) {
      console.error("Payment Error:", error);
      alert("Something went wrong initializing payment.");
    } finally {
      setIsLoading(false);
    }
  };

  return { initiatePayment, isLoading };
};