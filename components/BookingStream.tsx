import React, { useMemo } from 'react';
import { Guest } from '../types';
import { formatBookingStream, BookingStreamData } from '../services/bookingStreamFormatter';
import { HighlightedRaw } from './GuestRow';

interface BookingStreamProps {
    guest: Guest;
}

/** Labelled section with a header and content */
const Section: React.FC<{ label: string; children: React.ReactNode; color?: string }> = ({ label, children, color = '#c5a065' }) => (
    <div className="mb-2">
        <div className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color }}>{label}</div>
        <div className="text-[11px] leading-relaxed text-slate-200">{children}</div>
    </div>
);

/** Single key-value pair displayed inline */
const KV: React.FC<{ label: string; value?: string }> = ({ label, value }) => {
    if (!value) return null;
    return (
        <span className="mr-4 inline-block">
            <span className="text-slate-500 text-[9px] uppercase tracking-wider">{label}: </span>
            <span className="text-slate-200 text-[11px] font-medium"><HighlightedRaw text={value} /></span>
        </span>
    );
};

/**
 * BookingStream — Structured PDF-like display of booking data.
 * Replaces the raw text dump with clearly labelled, scannable sections.
 */
const BookingStream: React.FC<BookingStreamProps> = ({ guest }) => {
    const data: BookingStreamData = useMemo(
        () => formatBookingStream(guest.rawHtml, guest.id, guest.name, guest.room),
        [guest.rawHtml, guest.id, guest.name, guest.room]
    );

    const h = data.header;

    return (
        <div className="font-mono text-[11px] space-y-3">
            {/* ── HEADER ROW (mirrors the PDF table header) ── */}
            <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/50">
                <div className="flex flex-wrap gap-x-5 gap-y-1">
                    <KV label="ID" value={h.id} />
                    <KV label="Guest" value={h.name} />
                    <KV label="Room" value={h.room} />
                    {h.time && <KV label="Time" value={h.time.replace(/(\d{2})(\d{2})/, '$1:$2')} />}
                    <KV label="Status" value={h.status} />
                    <KV label="Departure" value={h.departure} />
                    <KV label="Type" value={h.type} />
                    <KV label="Rate Code" value={h.rateCode} />
                    <KV label="Rate" value={h.rate} />
                    <KV label="Car Reg" value={h.carReg || guest.car} />
                </div>
            </div>

            {/* ── COMPANY / CONTACT / OCCASION ── */}
            {(data.company || data.contact || data.occasion || data.poNumber) && (
                <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30">
                    <div className="flex flex-wrap gap-x-5 gap-y-1">
                        <KV label="Company" value={data.company} />
                        <KV label="Contact" value={data.contact} />
                        <KV label="Occasion" value={data.occasion} />
                        <KV label="P.O.Nr" value={data.poNumber} />
                    </div>
                </div>
            )}

            {/* ── TRACES ── */}
            {data.traces && (
                <Section label="Traces">
                    <HighlightedRaw text={data.traces} />
                </Section>
            )}

            {/* ── FACILITY BOOKINGS ── */}
            {data.facilityBookings.length > 0 && (
                <Section label="Facility Bookings" color="#6bb5e0">
                    <div className="space-y-0.5">
                        {data.facilityBookings.map((b, i) => (
                            <div key={i} className="pl-2 border-l-2 border-blue-500/30 py-0.5">
                                <HighlightedRaw text={b} />
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            {/* ── ALLERGIES / HK NOTES ── */}
            {(data.allergies || data.hkNotes) && (
                <div className="grid grid-cols-2 gap-3">
                    {data.allergies && (
                        <Section label="Allergies" color="#f87171">
                            <div className="text-red-300 font-semibold">
                                <HighlightedRaw text={data.allergies} />
                            </div>
                        </Section>
                    )}
                    {data.hkNotes && (
                        <Section label="HK Notes" color="#a78bfa">
                            <HighlightedRaw text={data.hkNotes} />
                        </Section>
                    )}
                </div>
            )}

            {/* ── BOOKING NOTES ── */}
            {data.bookingNotes.length > 0 && (
                <Section label="Booking Notes" color="#facc15">
                    <div className="space-y-0.5">
                        {data.bookingNotes.map((note, i) => (
                            <div key={i} className="pl-2 border-l-2 border-yellow-500/30 py-0.5">
                                <HighlightedRaw text={note} />
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            {/* ── IN ROOM ON ARRIVAL ── */}
            {data.inRoomItems.length > 0 && (
                <Section label="In Room on Arrival" color="#4ade80">
                    <div className="flex flex-wrap gap-1.5">
                        {data.inRoomItems.map((item, i) => (
                            <span key={i} className="inline-block bg-green-500/10 border border-green-500/20 rounded-lg px-2 py-0.5 text-green-300 text-[10px]">
                                {item}
                            </span>
                        ))}
                    </div>
                </Section>
            )}

            {/* ── LINE ITEMS (purchases) ── */}
            {data.lineItems.length > 0 && (
                <Section label="Charges & Extras" color="#fb923c">
                    <div className="space-y-0.5">
                        {data.lineItems.map((item, i) => (
                            <div key={i} className="pl-2 border-l-2 border-orange-500/30 py-0.5 text-orange-200">
                                <HighlightedRaw text={item} />
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            {/* ── BILLING ── */}
            {data.billing && (
                <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30">
                    <div className="text-[9px] font-black uppercase tracking-widest mb-1 text-slate-400">Billing</div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1">
                        <KV label="Total Rate" value={data.billing.totalRate} />
                        <KV label="Deposit" value={data.billing.deposit} />
                        <KV label="Billing" value={data.billing.billing} />
                        <KV label="Unit" value={data.billing.unit} />
                    </div>
                </div>
            )}

            {/* ── CHECKS ── */}
            {data.checks.length > 0 && (
                <Section label="Internal Checks" color="#94a3b8">
                    <div className="text-slate-400 text-[10px]">
                        {data.checks.join(' • ')}
                    </div>
                </Section>
            )}
        </div>
    );
};

export default BookingStream;
