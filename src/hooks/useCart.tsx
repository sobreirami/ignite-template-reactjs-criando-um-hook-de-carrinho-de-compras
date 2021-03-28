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
      let productExistsCart = cart.find(product => product.id === productId);

      const currentAmount = productExistsCart ? productExistsCart.amount : 0;
      const newProductAmount = currentAmount + 1;
      
      const responseStock = await api.get<Stock>(`/stock/${productId}`);
      const stock = responseStock.data;

      if(!stock) {
        throw new Error("Product not found");
      }

      if(newProductAmount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(!productExistsCart) {
        const responseProduct = await api.get<Product>(`/products/${productId}`);  
        productExistsCart = responseProduct.data;
      }

      const filterCart = cart.filter(c => c.id !== productId);

      const newCart = [
        ...filterCart,
        {
          ...productExistsCart, 
          amount: newProductAmount
        }
      ]

      setCart(newCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      
      const product = cart.find(product => product.id === productId);

      if (!product) {
        throw new Error('Produto não encontrado no carrinho')
      }

      const newCart = cart.filter(product => product.id !== productId)
      
      setCart(newCart)

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))  

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      if(amount < 1) {
        throw new Error("Product amount invalid.");
      }

      const responseStock = await api.get<Stock>(`/stock/${productId}`);
      const stock = responseStock.data;

      if(!stock) {
        throw new Error("Product not found.");
      }

      if (amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      const product = cart.find(product => product.id === productId);

      if(!product) {
        throw new Error("Product not found.");
      }

      const filterCart = cart.filter(c => c.id !== productId);

      const newCart = [
        ...filterCart,
        {
          ...product, 
          amount
        }
      ]

      setCart(newCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

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
