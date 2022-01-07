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
      const productAmount = await api.get<Stock>(`stock/${productId}`);

      const productInStock = productAmount.data.amount;

      const productInCart = cart.find(product => product.id === productId);

      const currentAmount = productInCart ? productInCart.amount : 0;

      const amount = currentAmount + 1;

      if (amount > productInStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }  

      if (!productInCart) {
        const response = await api.get<Product>(`products/${productId}`);

        const productWithAmount = {
          ...response.data,
          amount,
        }

        const cartUpdated = [...cart, productWithAmount];

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartUpdated))

        setCart(cartUpdated)
      } else {
        const cartUpdated = cart.map(item => {
          if (item.id === productId) {
            item.amount = amount;
          }

          return item;
        })

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartUpdated))

        setCart(cartUpdated)
      }
    } catch (e) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIndex = cart.findIndex(product => product.id === productId);

      if (productIndex === -1) {
        throw new Error("Product not found")
      }

      const cartUpdated = cart.filter(product => product.id !== productId)

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartUpdated))

      setCart(cartUpdated)
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const response = await api.get<Stock>(`/stock/${productId}`);

      const stockAmount = response.data.amount;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const cartUpdated = [...cart];

      const productIndex = cartUpdated.findIndex(product => product.id === productId);

      if (productIndex !== -1) {
        cartUpdated[productIndex].amount = amount;
        setCart(cartUpdated);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartUpdated))
      } else {
        throw new Error("Product not found")
      }
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
