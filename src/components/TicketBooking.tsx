import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

// Ticket tier types
type TicketTier = {
  label: string;
  value: string;
  price: number;
  available: number;
};

const TICKET_TIERS: TicketTier[] = [
  { label: "VIP", value: "VIP", price: 5000, available: 20 },
  { label: "Regular", value: "Regular", price: 2500, available: 50 },
  { label: "Economy", value: "Economy", price: 1000, available: 100 },
];

const RESERVATION_TIME_LIMIT = 10 * 60 * 1000; // 10 minutes

type Reservation = {
  tier: string;
  quantity: number;
  totalPrice: number;
  timestamp: number;
};

type ResponseType = {
  type: "success" | "error" | "warning";
  message: string;
};

export default function TicketBookingPage() {
  const [userId, setUserId] = useState<string>("");
  const [tier, setTier] = useState<string>("VIP");
  const [quantity, setQuantity] = useState<number>(1);
  const [response, setResponse] = useState<ResponseType | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [tick, setTick] = useState<number>(Date.now());

  const [tickets, setTickets] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    TICKET_TIERS.forEach(t => {
      initial[t.value] = t.available;
    });
    return initial;
  });

  const [reservations, setReservations] = useState<Record<string, Reservation>>({});
  const [payments, setPayments] = useState<Set<string>>(new Set());

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(Date.now());
      const now = Date.now();

      const expired = Object.keys(reservations).filter(key => {
        const res = reservations[key];
        return now - res.timestamp > RESERVATION_TIME_LIMIT && !payments.has(key);
      });

      if (expired.length > 0) {
        setReservations(prev => {
          const updated = { ...prev };
          expired.forEach(key => {
            const res = updated[key];
            setTickets(prevTickets => ({
              ...prevTickets,
              [res.tier]: prevTickets[res.tier] + res.quantity
            }));
            delete updated[key];
          });
          return updated;
        });

        setResponse({
          type: "warning",
          message: `การจองของ User ID: ${expired.join(", ")} หมดเวลาแล้ว กรุณาจองใหม่`,
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [reservations, payments]);

  const getReservationTimeLeft = (userId: string): number | null => {
    const res = reservations[userId];
    if (!res || payments.has(userId)) return null;
    const elapsed = Date.now() - res.timestamp;
    const remaining = RESERVATION_TIME_LIMIT - elapsed;
    return remaining > 0 ? remaining : 0;
  };

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleReserve = (): void => {
    if (!userId.trim()) {
      setResponse({ type: "error", message: "กรุณากรอกรหัสผู้ใช้" });
      return;
    }
    if (quantity < 1 || quantity > 5) {
      setResponse({ type: "error", message: "จำนวนตั๋วต้องอยู่ระหว่าง 1-5 ใบ" });
      return;
    }
    if (reservations[userId] && !payments.has(userId)) {
      setResponse({ type: "error", message: "คุณมีการจองที่ยังไม่ได้ชำระเงินอยู่แล้ว" });
      return;
    }
    if (tickets[tier] < quantity) {
      setResponse({
        type: "error",
        message: `ตั๋วประเภท ${tier} เหลือไม่เพียงพอ (เหลือ ${tickets[tier]} ใบ)`,
      });
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const selectedTier = TICKET_TIERS.find(t => t.value === tier)!;
      const totalPrice = selectedTier.price * quantity;

      setTickets(prev => ({ ...prev, [tier]: prev[tier] - quantity }));
      setReservations(prev => ({
        ...prev,
        [userId]: {
          tier,
          quantity,
          totalPrice,
          timestamp: Date.now(),
        },
      }));

      setResponse({
        type: "success",
        message: `จองตั๋วสำเร็จ!\nประเภท: ${tier}\nจำนวน: ${quantity} ใบ\nราคารวม: ${totalPrice.toLocaleString()} บาท\nกรุณาชำระเงินภายใน 10 นาที`,
      });

      setLoading(false);
    }, 1000);
  };

  const handlePay = (): void => {
    if (!userId.trim()) {
      setResponse({ type: "error", message: "กรุณากรอกรหัสผู้ใช้" });
      return;
    }

    const res = reservations[userId];
    if (!res) {
      setResponse({ type: "error", message: "ไม่พบการจองของคุณ" });
      return;
    }
    if (payments.has(userId)) {
      setResponse({ type: "error", message: "คุณได้ชำระเงินแล้ว" });
      return;
    }

    const timeLeft = getReservationTimeLeft(userId);
    if (!timeLeft || timeLeft <= 0) {
      setResponse({ type: "error", message: "การจองหมดเวลาแล้ว กรุณาจองใหม่" });
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setPayments(prev => new Set([...prev, userId]));
      setResponse({
        type: "success",
        message: `ชำระเงินสำเร็จ!\nเลขที่การสั่งซื้อ: ${userId}-${Date.now()}\nตั๋วของคุณได้รับการยืนยันแล้ว`,
      });
      setLoading(false);
    }, 1500);
  };

  const currentReservation = reservations[userId];
  const timeLeft = getReservationTimeLeft(userId);
  const isPaid = payments.has(userId);

  return (
    <div className="max-w-2xl mx-auto mt-10 p-4">
      <Card>
        <CardContent className="space-y-6 p-6">
          <h1 className="text-3xl font-bold text-center text-blue-600">
            ระบบจองตั๋วคอนเสิร์ต
          </h1>

          {/* Ticket Availability */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">ตั๋วคงเหลือ:</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              {TICKET_TIERS.map(t => (
                <div key={t.value} className="text-center">
                  <div className="font-medium">{t.label}</div>
                  <div className="text-blue-600">{tickets[t.value]} ใบ</div>
                  <div className="text-gray-500">{t.price.toLocaleString()} บาท</div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Inputs */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="userId">รหัสผู้ใช้ (User ID)</Label>
              <Input
                id="userId"
                value={userId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setUserId(e.target.value)
                }
                placeholder="กรอกรหัสผู้ใช้"
              />
            </div>

            <div>
              <Label htmlFor="tier">ประเภทที่นั่ง</Label>
              <select
                id="tier"
                value={tier}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setTier(e.target.value)
                }
                className="mt-1 w-full p-2 border border-gray-300 rounded-md"
              >
                {TICKET_TIERS.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.label} - {t.price.toLocaleString()} บาท
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="quantity">จำนวนตั๋ว (ไม่เกิน 5 ใบ)</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={5}
                value={quantity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const val = parseInt(e.target.value);
                  setQuantity(Number.isNaN(val) ? 1 : val);
                }}
              />
            </div>
          </div>

          {/* Reservation Info */}
          {currentReservation && !isPaid && timeLeft && timeLeft > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <span className="font-medium text-yellow-800">
                  เวลาที่เหลือในการชำระเงิน: {formatTime(getReservationTimeLeft(userId)!)}
                </span>
              </div>
              <div className="text-sm text-yellow-700">
                ประเภท: {currentReservation.tier} | จำนวน: {currentReservation.quantity} ใบ | ราคารวม:{" "}
                {currentReservation.totalPrice.toLocaleString()} บาท
              </div>
            </div>
          )}

          {/* Payment Success */}
          {isPaid && currentReservation && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">ชำระเงินเรียบร้อยแล้ว</span>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={handleReserve}
              disabled={loading || (currentReservation && !isPaid)}
              className="flex-1"
            >
              {loading ? "กำลังจอง..." : "จองตั๋ว"}
            </Button>
            <Button
              variant="secondary"
              onClick={handlePay}
              disabled={
                loading || !currentReservation || isPaid || (timeLeft !== null && timeLeft <= 0)
              }
              className="flex-1"
            >
              {loading ? "กำลังชำระ..." : "ชำระเงิน"}
            </Button>
          </div>

          {/* Response Message */}
          {response && (
            <div
              className={`p-4 rounded-lg border ${
                response.type === "success"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : response.type === "error"
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-yellow-50 border-yellow-200 text-yellow-800"
              }`}
            >
              <div className="flex items-start gap-2">
                {response.type === "success" && <CheckCircle className="h-5 w-5 mt-0.5" />}
                {response.type === "error" && <XCircle className="h-5 w-5 mt-0.5" />}
                {response.type === "warning" && <AlertTriangle className="h-5 w-5 mt-0.5" />}
                <pre className="text-sm whitespace-pre-wrap font-sans">
                  {response.message}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
