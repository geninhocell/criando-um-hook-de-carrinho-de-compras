import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productExists = cart.find(p => p.id === productId);  
      
      const stockResponse = await api.get<Stock>(`/stock/${productId}`);

      const { amount } = stockResponse.data;

      if(productExists) {
        const limit = productExists.amount + 1;

        if(limit > amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        };
      }      

      if(productExists){
        const newCartAddAmount = cart.map(p => {
          if(p.id === productId) {
            const incrementAmount = p.amount + 1;

            return {
              ...p,
              amount: incrementAmount,
            }
          } else {
            return p;
          }
        });     

        setCart(newCartAddAmount);    
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCartAddAmount));    
      } else {
        const response = await api.get<Product>(`/products/${productId}`);

        const newProduct = response.data;
  
        newProduct.amount = 1;

        const newProducts = [
          ...cart,
          newProduct,
        ]
  
        setCart(newProducts);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newProducts));
      };

      
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const findProduct = cart.some(p => p.id === productId);

      if(!findProduct){
        throw new Error();
      }

      const filterProducts = cart.filter(p => p.id !== productId);

      setCart(filterProducts);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(filterProducts));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0){
        return;
      }

      const stockResponse = await api.get<Stock>(`/stock/${productId}`);

      const stock = stockResponse.data;

      if(stock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updateProducts = cart.map(p => {
        if(p.id === productId) {
          return {
            ...p,
            amount,
          };
        } else {
          return p;
        }
      });

      setCart(updateProducts);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateProducts));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
