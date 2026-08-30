// Etapas del seguimiento de pedido (rastreador de clientes).
export const ORDER_STEPS = ['Pendiente de pago', 'Confirmado', 'En preparación', 'Listo para entrega'];

// Mapea el estado guardado en la orden a un índice de etapa.
export function statusToStep(status: string | null | undefined): number {
    switch ((status || '').toLowerCase()) {
        case 'reserved':
        case 'pending':
        case 'pending_payment':
            return 0;
        case 'confirmed':
        case 'paid':
            return 1;
        case 'preparing':
        case 'in_preparation':
            return 2;
        case 'ready':
        case 'ready_for_pickup':
        case 'completed':
        case 'delivered':
            return 3;
        default:
            return 0;
    }
}

export function statusLabel(status: string | null | undefined): string {
    return ORDER_STEPS[statusToStep(status)];
}
