export type Producto = {
  id: string;
  nombre: string;
  tipo: 'flor' | 'resina' | 'bebida' | 'otro';
  categoria: 'peso' | 'unidad';
  stock: number;
  precio: number;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
};
