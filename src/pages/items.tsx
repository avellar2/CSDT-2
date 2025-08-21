import { ItemFormModern } from "@/components/Item/ItemFormModern";
import { ToastContainer } from "@/components/ui/Toast";
import React, { useState } from "react";

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

const ItemsPage: React.FC = () => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = (message: string, type: Toast['type'], duration?: number) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newToast = { id, message, type, duration };
        setToasts(prev => [...prev, newToast]);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto py-8 px-4">
                <div className="max-w-4xl mx-auto">
                    <ItemFormModern onToast={addToast} />
                </div>
            </div>
            
            <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
    );
}

export default ItemsPage;