import React, { useMemo } from 'react';
import { Guest } from '../types';
import { formatBookingStream, BookingStreamData } from '../services/bookingStreamFormatter';
import { HighlightedRaw } from './GuestRow';

interface BookingStreamProps {
    guest: Guest;
}

/** Labelled section with a header and content */
const Section: React.FC<{ label: string; children: React.ReactNode; color?: string }> = ({ label, children, color }) => (
    <div className="bs-section">
        <div className="bs-section-label" style={color ? { color } : undefined}>{label}</div>
        <div className="bs-section-content">{children}</div>
    </div>
);

/** Single key-value pair displayed inline */
const KV: React.FC<{ label: string; value?: string }> = ({ label, value }) => {
    if (!value) return null;
    return (
        <span className="bs-kv">
            <span className="bs-kv-label">{label}: </span>
            <span className="bs-kv-value"><HighlightedRaw text={value} /></span>
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
        <div className="bs-root">
            {/* ── HEADER ROW ── */}
            <div className="bs-card bs-card-header">
                <div className="bs-kv-row">
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
                <div className="bs-card">
                    <div className="bs-kv-row">
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
                <Section label="Facility Bookings" color="var(--bs-blue)">
                    <div className="bs-list">
                        {data.facilityBookings.map((b, i) => (
                            <div key={i} className="bs-list-item bs-list-item--blue">
                                <HighlightedRaw text={b} />
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            {/* ── ALLERGIES / HK NOTES ── */}
            {(data.allergies || data.hkNotes) && (
                <div className="bs-grid-2">
                    {data.allergies && (
                        <Section label="Allergies" color="var(--bs-red)">
                            <div className="bs-allergy">
                                <HighlightedRaw text={data.allergies} />
                            </div>
                        </Section>
                    )}
                    {data.hkNotes && (
                        <Section label="HK Notes" color="var(--bs-purple)">
                            <HighlightedRaw text={data.hkNotes} />
                        </Section>
                    )}
                </div>
            )}

            {/* ── BOOKING NOTES ── */}
            {data.bookingNotes.length > 0 && (
                <Section label="Booking Notes" color="var(--bs-yellow)">
                    <div className="bs-list">
                        {data.bookingNotes.map((note, i) => (
                            <div key={i} className="bs-list-item bs-list-item--yellow">
                                <HighlightedRaw text={note} />
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            {/* ── IN ROOM ON ARRIVAL ── */}
            {data.inRoomItems.length > 0 && (
                <Section label="In Room on Arrival" color="var(--bs-green)">
                    <div className="bs-tags">
                        {data.inRoomItems.map((item, i) => (
                            <span key={i} className="bs-tag bs-tag--green">
                                {item}
                            </span>
                        ))}
                    </div>
                </Section>
            )}

            {/* ── LINE ITEMS (purchases) ── */}
            {data.lineItems.length > 0 && (
                <Section label="Charges & Extras" color="var(--bs-orange)">
                    <div className="bs-list">
                        {data.lineItems.map((item, i) => (
                            <div key={i} className="bs-list-item bs-list-item--orange">
                                <HighlightedRaw text={item} />
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            {/* ── BILLING ── */}
            {data.billing && (
                <div className="bs-card">
                    <div className="bs-section-label" style={{ color: 'var(--bs-muted)' }}>Billing</div>
                    <div className="bs-kv-row">
                        <KV label="Total Rate" value={data.billing.totalRate} />
                        <KV label="Deposit" value={data.billing.deposit} />
                        <KV label="Billing" value={data.billing.billing} />
                        <KV label="Unit" value={data.billing.unit} />
                    </div>
                </div>
            )}

            {/* ── CHECKS ── */}
            {data.checks.length > 0 && (
                <Section label="Internal Checks" color="var(--bs-muted)">
                    <div className="bs-checks">
                        {data.checks.join(' • ')}
                    </div>
                </Section>
            )}
        </div>
    );
};

export default BookingStream;
