import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

interface InvestConfirmPopoverProps {
    slotName: string;
    cost: number;
    onConfirm: () => void;
    onCancel: () => void;
    anchorRect?: DOMRect | null;
}

export const InvestConfirmPopover: React.FC<InvestConfirmPopoverProps> = ({
    slotName,
    cost,
    onConfirm,
    onCancel,
    anchorRect,
}) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);

    // ========== Mobile: Bottom Sheet ==========
    if (isMobile) {
        const content = (
            <>
                <div
                    className="fixed inset-0"
                    onClick={onCancel}
                    style={{ background: 'rgba(0,0,0,0.4)', zIndex: 9999 }}
                />
                <div
                    className="fixed bottom-0 left-0 right-0 animate-slide-up"
                    style={{ zIndex: 10000 }}
                >
                    <div
                        className="rounded-t-2xl p-4 pb-6 shadow-2xl"
                        style={{
                            background: 'var(--glass-bg-light)',
                            borderTop: '1px solid var(--glass-border-light)',
                        }}
                    >
                        {/* Handle */}
                        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--color-card-border)' }} />

                        <p className="text-sm t-text font-medium text-center mb-1">
                            💰 花 <span className="text-gold-400 font-bold text-lg">{cost}</span> 元投资
                        </p>
                        <p className="text-sm t-text-2 text-center mb-4 font-semibold">
                            {slotName}？
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={onCancel}
                                className="flex-1 px-4 py-2.5 text-sm rounded-xl t-text-2 font-medium transition-colors"
                                style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-card-border)' }}
                            >
                                取消
                            </button>
                            <button
                                onClick={onConfirm}
                                className="flex-1 px-4 py-2.5 text-sm rounded-xl font-semibold text-white bg-ocean-500 hover:bg-ocean-600 transition-colors"
                            >
                                确认投资
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
        return ReactDOM.createPortal(content, document.body);
    }

    // ========== Desktop: Popover above slot ==========
    const popoverWidth = 200;
    const popoverHeight = 100;
    const style: React.CSSProperties = anchorRect
        ? {
            position: 'fixed',
            left: Math.max(8, anchorRect.left + anchorRect.width / 2 - popoverWidth / 2),
            top: Math.max(8, anchorRect.top - popoverHeight - 12),
            zIndex: 10000,
        }
        : {
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10000,
        };

    const content = (
        <>
            <div
                className="fixed inset-0"
                onClick={onCancel}
                style={{ background: 'rgba(0,0,0,0.2)', zIndex: 9999 }}
            />
            <div
                className="card-light rounded-xl p-3 shadow-xl animate-bounce-in"
                style={{ ...style, width: popoverWidth }}
            >
                {anchorRect && (
                    <div
                        className="absolute w-3 h-3 rotate-45"
                        style={{
                            bottom: -6,
                            left: '50%',
                            marginLeft: -6,
                            background: 'var(--glass-bg-light)',
                            borderRight: '1px solid var(--glass-border-light)',
                            borderBottom: '1px solid var(--glass-border-light)',
                        }}
                    />
                )}
                <p className="text-xs t-text font-medium text-center mb-2">
                    💰 花 <span className="text-gold-400 font-bold">{cost}</span> 元投资
                </p>
                <p className="text-xs t-text-2 text-center mb-3 font-semibold">
                    {slotName}？
                </p>
                <div className="flex gap-2">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-2 py-1.5 text-[11px] rounded-lg t-text-2 transition-colors"
                        style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-card-border)' }}
                    >
                        取消
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-2 py-1.5 text-[11px] rounded-lg font-semibold text-white bg-ocean-500 hover:bg-ocean-600 transition-colors"
                    >
                        确认
                    </button>
                </div>
            </div>
        </>
    );

    return ReactDOM.createPortal(content, document.body);
};
