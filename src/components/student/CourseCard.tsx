"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  BookOpen, 
  Users, 
  Clock, 
  IndianRupee, 
  User, 
  CheckCircle, 
  Loader2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CourseCardProps {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  image?: string;
  description?: string;
  duration: number;
  instructor?: string;
  totalClasses?: number;
  totalFees: number;
  discountFees: number;
  discountPercentage: number;
  status: 'active' | 'inactive';
  isEnrolled?: boolean;
  onEnrollSuccess?: () => void;
}

export function CourseCard({
  courseId,
  courseCode,
  courseTitle,
  image,
  description,
  duration,
  instructor,
  totalClasses = 24,
  totalFees,
  discountFees,
  discountPercentage,
  status,
  isEnrolled = false,
  onEnrollSuccess,
}: CourseCardProps) {
  const [loading, setLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [enrolled, setEnrolled] = useState(isEnrolled);
  const router = useRouter();

  useEffect(() => {
    setEnrolled(isEnrolled);
  }, [isEnrolled]);

  const originalPrice = Math.max(0, Number(totalFees ?? 0));
  const discountedPrice = Math.max(0, Number(discountFees ?? originalPrice));
  const percentage = Math.max(0, Number(discountPercentage ?? 0));
  const showDiscount = discountedPrice < originalPrice;

  const handleEnroll = async () => {
    if (enrolled) return;
    if (!courseId) {
      toast({ title: 'Error', description: 'Invalid course selected.', variant: 'destructive' });
      return;
    }

    if (!Number.isFinite(discountedPrice) || discountedPrice <= 0) {
      toast({ title: 'Payment Error', description: 'Invalid course amount. Please contact support.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Create order on backend
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({ amount: discountedPrice, courseId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Payment Error', description: data.error || 'Failed to create payment order', variant: 'destructive' });
        setLoading(false);
        return;
      }

      const order = data.order;
      const razorpayKeyId =
        data.keyId ||
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
        "";

      if (!order?.id || !razorpayKeyId) {
        toast({
          title: "Payment Error",
          description: "Payment gateway key is missing. Contact support.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Load Razorpay script
      await new Promise<void>((resolve, reject) => {
        if (typeof window === 'undefined') return reject(new Error('No window'));
        if ((window as unknown as { Razorpay?: unknown }).Razorpay) return resolve();
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Razorpay script failed to load'));
        document.body.appendChild(script);
      });

      const options = {
        key: razorpayKeyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Little Brushes Art Academy',
        description: courseTitle,
        image: '/logo.png',
        order_id: order.id,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            console.log('=== PAYMENT SUCCESS HANDLER ===');
            console.log('Razorpay response:', response);
            console.log('Sending verify request with:', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: order.amount / 100,
              courseId,
            });

            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include', // IMPORTANT: Include cookies for authentication
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount: order.amount / 100,
                courseId,
              }),
            });
            const verifyData = await verifyRes.json();
            
            console.log('Verify response:', {
              status: verifyRes.status,
              ok: verifyRes.ok,
              data: verifyData,
            });

            if (!verifyRes.ok) {
              console.error('Verification failed:', verifyData);
              toast({ title: 'Payment Verify Failed', description: verifyData.error || 'Verification failed', variant: 'destructive' });
              return;
            }

            console.log('Enrollment saved successfully!');
            setEnrolled(true);
            toast({ title: 'Enrolled', description: 'Payment successful and enrollment saved', variant: 'default' });
            onEnrollSuccess?.();
          } catch (err) {
            console.error('Verify error', err);
            toast({ title: 'Error', description: 'Payment verification error', variant: 'destructive' });
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      };

      const RazorpayCtor = (window as unknown as { Razorpay?: unknown }).Razorpay as unknown as new (opts: unknown) => { open: () => void };
      const rzp = new RazorpayCtor(options as unknown);
      rzp.open();
    } catch (error) {
      console.error('Enrollment error:', error);
      toast({ title: 'Error', description: 'An error occurred during enrollment', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getInvoiceFileName = () => {
    const cleanTitle = courseTitle.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '').toLowerCase();
    return `invoice-${cleanTitle}.pdf`;
  };

  const handleDownloadInvoice = async () => {
    setInvoiceLoading(true);
    try {
      const res = await fetch(`/api/invoice/download/${courseId}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        const body = await res.json().catch(async () => {
          const text = await res.text().catch(() => null);
          return { error: text || 'Unable to download invoice' };
        });
        throw new Error(body?.error || 'Unable to download invoice');
      }

      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition') || '';
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const filename = match?.[1] || getInvoiceFileName();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast({ title: 'Invoice downloaded successfully', description: 'Your invoice has been downloaded.', variant: 'default' });
    } catch (error) {
      console.error('Invoice download failed:', error);
      toast({ title: 'Download Error', description: error instanceof Error ? error.message : 'Could not download the invoice.', variant: 'destructive' });
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleView = () => {
    router.push(`/student/courses/${courseId}`);
  };

  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary/20">
      {/* Image Section */}
      <div className="relative h-56 w-full overflow-hidden bg-slate-900">
        {image ? (
          <img
            src={image}
            alt={courseTitle}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BookOpen className="h-12 w-12 text-primary/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/10 to-transparent" />
        
        {/* Status Badge */}
        <div className="absolute right-4 top-4 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur">
          {status === 'active' ? 'Active' : 'Inactive'}
        </div>

        {/* Enrollment Badge */}
        {enrolled && (
          <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-success/90 px-2.5 py-1 text-[11px] font-semibold text-white">
            <CheckCircle className="h-3 w-3" />
            Enrolled
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="space-y-3 p-4">
        {/* Title */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="line-clamp-2 text-xl font-semibold text-slate-950">
              {courseTitle}
            </h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              {courseCode}
            </span>
          </div>
        </div>

        {/* Instructor */}
        {instructor && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <User className="h-4 w-4" />
            <span>{instructor}</span>
          </div>
        )}

        {/* Metadata Grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Duration */}
          <div className="flex items-center gap-2 rounded-lg bg-muted/30 p-2">
            <Clock className="h-3.5 w-3.5 flex-shrink-0 text-primary/60" />
            <div>
              <p className="text-[10px] text-muted-foreground">Duration</p>
              <p className="text-xs font-semibold text-foreground">
                {duration} {duration === 1 ? "month" : "months"}
              </p>
            </div>
          </div>

          {/* Classes */}
          <div className="flex items-center gap-2 rounded-lg bg-muted/30 p-2">
            <Users className="h-3.5 w-3.5 flex-shrink-0 text-primary/60" />
            <div>
              <p className="text-[10px] text-muted-foreground">Classes</p>
              <p className="text-xs font-semibold text-foreground">{totalClasses}</p>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Payable Amount</p>
              <p className="mt-1 text-xl font-semibold text-slate-950">₹{discountedPrice.toLocaleString('en-IN')}</p>
            </div>
            {showDiscount ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                {percentage}% OFF
              </span>
            ) : null}
          </div>
          {showDiscount ? (
            <p className="mt-4 text-sm text-slate-500 line-through">
              ₹{originalPrice.toLocaleString('en-IN')}
            </p>
          ) : null}
        </div>

        {/* Actions: View + Enroll / Invoice */}
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
          <Button
            onClick={handleView}
            disabled={loading}
            variant="outline"
            className="flex-1 min-w-0 rounded-[22px] border-blue-500 bg-white text-slate-900 shadow-sm shadow-slate-200/60 py-3 px-4 text-sm font-semibold transition duration-300 ease-out hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-blue-200/40"
          >
            View Course
          </Button>

          {enrolled ? (
            <>
              <Button
                disabled
                className="flex-1 min-w-0 rounded-[22px] bg-emerald-100/95 text-emerald-900 border border-emerald-200 shadow-sm shadow-emerald-300/20 py-3 px-4 text-sm font-semibold cursor-not-allowed backdrop-blur-sm"
              >
                <CheckCircle className="mr-2 h-4 w-4 text-emerald-700" />
                Enrolled
              </Button>
              <Button
                onClick={handleDownloadInvoice}
                disabled={invoiceLoading}
                className="flex-1 min-w-0 rounded-[22px] bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-600 text-white shadow-lg py-3 px-4 text-sm font-semibold transition transform duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_50px_-25px_rgba(56,189,248,0.45)] hover:animate-pulse"
              >
                {invoiceLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                    <Download className="h-4 w-4" />
                    <span>Invoice</span>
                  </div>
                )}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleEnroll}
              disabled={loading || status !== 'active'}
              className="flex-1 min-w-0 rounded-[22px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-slate-900/10 py-3 px-4 text-sm font-semibold transition duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_45px_-24px_rgba(59,130,246,0.85)]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Enroll Now'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
