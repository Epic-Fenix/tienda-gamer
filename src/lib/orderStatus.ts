// Etapas del seguimiento de pedido (rastreador de clientes).
export const ORDER_STEPS = ['Pendiente', 'Confirmado', 'En preparación', 'Listo para entrega', 'Entregado'];

// Opciones canónicas para el selector de estado en /admin.
export const ORDER_STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'confirmed', label: 'Confirmado' },
    { value: 'preparing', label: 'En preparación' },
    { value: 'ready', label: 'Listo para entrega' },
    { value: 'delivered', label: 'Entregado' },
];

// Normaliza cualquier estado guardado a uno de los valores canónicos del selector.
export function normalizeStatus(status: string | null | undefined): string {
    switch ((status || '').toLowerCase()) {
        case 'reserved':
        case 'pending':
        case 'pending_payment':
            return 'pending';
        case 'confirmed':
        case 'paid':
            return 'confirmed';
        case 'preparing':
        case 'in_preparation':
            return 'preparing';
        case 'ready':
        case 'ready_for_pickup':
            return 'ready';
        case 'delivered':
        case 'completed':
            return 'delivered';
        default:
            return 'pending';
    }
}

// Índice de etapa (0-4) para el stepper.
export function statusToStep(status: string | null | undefined): number {
    const idx = ORDER_STATUS_OPTIONS.findIndex((o) => o.value === normalizeStatus(status));
    return idx < 0 ? 0 : idx;
}

export function statusLabel(status: string | null | undefined): string {
    return ORDER_STEPS[statusToStep(status)];
}
