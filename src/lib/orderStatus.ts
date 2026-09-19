// Etapas del seguimiento de pedido (rastreador de clientes).
export const ORDER_STEPS = ['Pendiente', 'Confirmado', 'En preparación', 'Listo para entrega', 'Entregado'];

// Opciones canónicas para el selector de estado en /admin.
export const ORDER_STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'confirmed', label: 'Confirmado' },
    { value: 'preparing', label: 'En preparación' },
    { value: 'ready', label: 'Listo para entrega' },
    { value: 'delivered', label: 'Entregado' },
    { value: 'cancelled', label: 'Cancelado' },
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
        case 'cancelled':
        case 'canceled':
            return 'cancelled';
        default:
            return 'pending';
    }
}

// Índice de etapa (0-4) para el stepper. Cancelado no es una etapa → -1.
export function statusToStep(status: string | null | undefined): number {
    const n = normalizeStatus(status);
    if (n === 'cancelled') return -1;
    const idx = ORDER_STEPS.findIndex((_, i) => ORDER_STATUS_OPTIONS[i]?.value === n);
    return idx < 0 ? 0 : idx;
}

export function statusLabel(status: string | null | undefined): string {
    if (normalizeStatus(status) === 'cancelled') return 'Cancelado';
    const step = statusToStep(status);
    return ORDER_STEPS[step] ?? 'Pendiente';
}
