# Architecture Spec: G-INVT-004
The inventory state machine governs requested -> reserved -> committed/released/expired. It calculates available stock = total_stock - reserved_stock and locks rows during reservation.
