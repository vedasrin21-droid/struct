/**
 * STRUCT CLIENT RAZORPAY CHECKOUT HANDLER
 * 
 * Safely initializes and launches the Razorpay Checkout Modal:
 * 1. Loads https://checkout.razorpay.com/v1/checkout.js dynamically.
 * 2. Initiates server-side order creation.
 * 3. Launches payment modal with STRUCT branding and rupee currency.
 * 4. Submits payment signature to server verification endpoint.
 * 5. Returns verified entitlement balance.
 */

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export interface CheckoutResult {
  success: boolean;
  orderId?: string;
  paymentId?: string;
  remainingUsages?: number;
  email?: string;
  error?: string;
  cancelled?: boolean;
}

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.Razorpay) return resolve(true);

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function startRazorpayCheckout(params: {
  productId: string;
  email: string;
  onSuccess?: (result: CheckoutResult) => void;
  onError?: (err: Error) => void;
  onDismiss?: () => void;
}): Promise<CheckoutResult> {
  const { productId, email, onSuccess, onError, onDismiss } = params;

  try {
    // 1. Create server-side order with authoritative pricing
    const orderRes = await fetch('/api/payments/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, email }),
    });

    if (!orderRes.ok) {
      const errData = await orderRes.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to initiate order on server.');
    }

    const orderData = await orderRes.json();

    // 2. Load Razorpay script
    const isScriptLoaded = await loadRazorpayScript();
    if (!isScriptLoaded || !window.Razorpay) {
      throw new Error('Could not load Razorpay payment gateway script. Please check your network connection.');
    }

    // 3. Launch Checkout Modal
    return new Promise((resolve) => {
      const options = {
        key: orderData.keyId,
        amount: orderData.amount, // in paise
        currency: orderData.currency || 'INR',
        name: 'STRUCT Career Platform',
        description: orderData.product?.name || 'Resume AI Polish (2 Usages)',
        order_id: orderData.orderId,
        prefill: {
          email: orderData.email,
        },
        theme: {
          color: '#12336B',
        },
        modal: {
          ondismiss: () => {
            if (onDismiss) onDismiss();
            resolve({ success: false, cancelled: true, error: 'Payment modal closed by user.' });
          },
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            // 4. Verify Payment Server-Side
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || 'Payment verification failed on server.');
            }

            let remainingUsages = verifyData.remainingUsages;
            // If webhook capture is still in flight, poll /api/entitlements/balance briefly
            if (!verifyData.captured && verifyData.email) {
              for (let attempt = 0; attempt < 3; attempt++) {
                await new Promise((r) => setTimeout(r, 600));
                try {
                  const balRes = await fetch(`/api/entitlements/balance?email=${encodeURIComponent(verifyData.email)}`);
                  if (balRes.ok) {
                    const balData = await balRes.json();
                    if (balData.remainingBalance > remainingUsages) {
                      remainingUsages = balData.remainingBalance;
                      break;
                    }
                  }
                } catch {
                  // ignore polling network errors
                }
              }
            }

            const result: CheckoutResult = {
              success: true,
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              remainingUsages,
              email: verifyData.email,
            };

            if (onSuccess) onSuccess(result);
            resolve(result);
          } catch (verifyErr: any) {
            if (onError) onError(verifyErr);
            resolve({
              success: false,
              error: verifyErr.message || 'Payment signature verification failed.',
            });
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (failResponse: any) => {
        const errorDesc = failResponse.error?.description || 'Payment transaction failed.';
        if (onError) onError(new Error(errorDesc));
        resolve({ success: false, error: errorDesc });
      });
      rzp.open();
    });
  } catch (error: any) {
    if (onError) onError(error);
    return { success: false, error: error.message || 'Payment initiation failed.' };
  }
}
