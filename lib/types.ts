export type Producto = {
  id: string;
  nombre: string;
  tipo: 'weed' | 'extraccion' | 'bebida' | 'otro';
  subtipo?: 'ICE O LATOR' | 'BHO' | 'DRY SIFT' | 'HASH' | null;
  categoria: 'peso' | 'unidad';
  stock: number;
  precio: number;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
};
