import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import supabase from "./supabase";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw } from "lucide-react";
import { Toaster, toast } from "react-hot-toast";
import RequestHistory from "./components/RequestHistory";
interface DashboardProps {
  user: User;
}

interface InventoryItem {
  id: number;
  name: string;
  description: string;
  quantity: number;
  location: string;
  status: string;
  remaining_quantity: number;
}

interface Transaction {
  id: number;
  inventory_id: number;
  borrow_date: string;
  return_date: string | null;
  status: string;
  inventory: InventoryItem;
  quantity: number;
  damaged_quantity: number | null;
  fine_amount: number | null;
  damage_image_url: string ;
}

interface CartItem {
  id: number;
  cart_id: number;
  inventory_id: number;
  quantity: number;
  inventory: InventoryItem;
  return_date: string | null;
}

interface Cart {
  id: number;
  status: 'draft' | 'requested' | 'accepted' | 'rejected';
  items: CartItem[];
}

export default function Dashboard({ user }: DashboardProps) {
  // State
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cart, setCart] = useState<Cart | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuantities, setSelectedQuantities] = useState<{
    [key: number]: number;
  }>({});

  // Fetch data on mount
  useEffect(() => {
    fetchInventory();
    fetchTransactions();
    fetchCart();
   
  }, []);

  // Fetch inventory
  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .order("id", { ascending: true });

      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    }
  };

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user)
        throw new Error("Unable to fetch authenticated user");

      const { data: borrowerData, error: borrowerError } = await supabase
        .from("borrowers")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (borrowerError || !borrowerData) throw new Error("Borrower not found");

      const borrowerId = borrowerData.id;

      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
          *,
          inventory:inventory_id (*)
        `
        )
        .eq("borrower_id", borrowerId)
        .order("borrow_date", { ascending: false });

      if (error) throw error;

      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch or create cart
const fetchCart = async () => {
  try {
    // ✅ Fetch authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user)
      throw new Error("Unable to fetch authenticated user");

    const { data: borrowerData, error: borrowerError } = await supabase
      .from("borrowers")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (borrowerError || !borrowerData) throw new Error("Borrower not found");

    // First, try to find an existing draft cart
    let { data: cartData } = await supabase
      .from("cart")
      .select("*")
      .eq("borrower_id", borrowerData.id)
      .eq("status", "draft")
      .single();

    // If no draft cart exists, create a new one
    if (!cartData) {
      const { data: newCart, error: createError } = await supabase
        .from("cart")
        .insert({ borrower_id: borrowerData.id, status: "draft" })
        .select()
        .single();

      if (createError) throw createError;
      cartData = newCart;
    }

    // Fetch cart items with inventory details
    if (cartData) {
      const { data: items, error: itemsError } = await supabase
        .from("cart_items")
        .select(
          `
          *,
          inventory:inventory_id (*)
        `
        )
        .eq("cart_id", cartData.id);

      if (itemsError) throw itemsError;

      setCart(cartData);
      setCartItems(items || []);
    }
  } catch (error) {
    console.error("Error fetching cart:", error);
  }
};



  // Add to cart with quantity
  // Add these helper functions
  const getDefaultReturnDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  };
  
  const updateReturnDate = async (itemId: number, newDate: string) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ return_date: newDate })
        .eq('id', itemId);
      
      if (error) throw error;
      await fetchCart();
      toast.success('Return date updated');
    } catch (error) {
      console.error('Error updating return date:', error);
      toast.error('Failed to update return date');
    }
  };
  
  // Update addToCart function
  const addToCart = async (inventoryItem: InventoryItem, quantity: number = 1) => {
    try {
      if (!cart) return;
  
      const existingItem = cartItems.find(
        (item) => item.inventory_id === inventoryItem.id
      );
  
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity <= 0) return;
        const { error } = await supabase
          .from("cart_items")
          .update({ quantity: newQuantity })
          .eq("cart_id", cart.id)
          .eq("inventory_id", inventoryItem.id);
        if (error) throw error;
        toast.success(`Updated ${inventoryItem.name} quantity in cart`);
      } else {
        if (quantity <= 0) return;
        const { error } = await supabase.from("cart_items").insert({
          cart_id: cart.id,
          inventory_id: inventoryItem.id,
          quantity,
          return_date: getDefaultReturnDate() // Add default return date
        });
        if (error) throw error;
        toast.success(`Added ${inventoryItem.name} to cart`);
      }
      await fetchCart();
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to update cart");
    }
  };

  // Remove from cart
  const removeFromCart = async (inventoryId: number) => {
    try {
      if (!cart) return;
      const itemToRemove = cartItems.find(
        (item) => item.inventory_id === inventoryId
      );
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("cart_id", cart.id)
        .eq("inventory_id", inventoryId);
      if (error) throw error;
       toast.success(`Removed ${itemToRemove?.inventory.name} from cart`);
      await fetchCart();
    } catch (error) {
      console.error("Error removing from cart:", error);
       toast.error("Failed to remove item from cart");
  
    }
    fetchCart()
  };

  // Submit cart request
  // Update the submitCartRequest function to create a new cart after submission
  const submitCartRequest = async () => {
    try {
      if (!cart) return;
      const { error } = await supabase
        .from("cart")
        .update({ status: "requested" })
        .eq("id", cart.id);
      if (error) throw error;

      // Force create a new cart immediately after submission
      // const { data: borrowerData } = await supabase
      //   .from("borrowers")
      //   .select("id")
      //   .eq("auth_id", user.id)
      //   .single();

      // if (borrowerData) {
      //   const { data: newCart } = await supabase
      //     .from("cart")
      //     .insert({ borrower_id: borrowerData.id, status: "draft" })
      //     .select()
      //     .single();

      //   if (newCart) {
      //     setCart(newCart);
      //     setCartItems([]);
      //   }
      // }
      await fetchCart();
      toast.success("Cart submitted for approval");
    } catch (error) {
      console.error("Error submitting cart:", error);
      toast.error("Failed to submit cart");
    }
  };
  // Quantity input handler
  const handleQuantityChange = (itemId: number, value: number) => {
    setSelectedQuantities((prev) => ({
      ...prev,
      [itemId]: Math.max(
        1,
        Math.min(
          value,
          inventory.find((item) => item.id === itemId)?.remaining_quantity || 1
        )
      ),
    }));
  };

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Loading screen
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center w-screen h-screen bg-gradient-to-br from-indigo-900 via-blue-800 to-indigo-700">
        <Toaster position="top-right" />
        <div className="relative">
          {/* Outer spinning ring */}
          <div
            className="absolute inset-0 rounded-full border-4 border-blue-300 border-opacity-20 animate-spin"
            style={{ animationDuration: "3s" }}
          ></div>

          {/* Middle spinning ring */}
          <div
            className="absolute inset-0 rounded-full border-4 border-t-blue-400 border-l-transparent border-r-transparent border-b-blue-400 animate-spin"
            style={{ animationDuration: "2s" }}
          ></div>

          {/* Inner content */}
          <div className="relative flex items-center justify-center h-32 w-32 rounded-full bg-white bg-opacity-10 backdrop-blur-sm shadow-lg">
            <RefreshCw
              className="h-12 w-12 text-blue-200 animate-pulse"
              style={{ animationDuration: "1.5s" }}
            />
          </div>
        </div>

        {/* Text content with glass effect */}
        <div className="mt-10 px-8 py-4 rounded-lg bg-white bg-opacity-10 backdrop-blur-md shadow-xl border border-white border-opacity-20">
          <h3 className="text-2xl font-bold text-white text-center">
            <span className="inline-block animate-pulse">Preparing</span>
            <span className="inline-block text-black"> your inventory</span>
          </h3>
          <div className="flex justify-center mt-3 space-x-1">
            <div
              className="h-2 w-2 rounded-full bg-blue-300 animate-bounce"
              style={{ animationDelay: "0s" }}
            ></div>
            <div
              className="h-2 w-2 rounded-full bg-blue-300 animate-bounce"
              style={{ animationDelay: "0.2s" }}
            ></div>
            <div
              className="h-2 w-2 rounded-full bg-blue-300 animate-bounce"
              style={{ animationDelay: "0.4s" }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  // Main UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 min-w-screen">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <header className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 border-b border-blue-700 shadow-lg px-6 py-5">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <svg
                className="w-8 h-8 text-white animate-spin-slow"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 4.75V6.25M12 17.75V19.25M18.25 12H19.75M4.25 12H5.75M16.343 16.343L17.404 17.404M6.596 6.596L7.657 7.657M16.343 7.657L17.404 6.596M6.596 17.404L7.657 16.343"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Inventory System
              </h1>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-gray-100 font-medium">{user.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium te text-red-400 bg-blue-500 rounded-lg transition-colors duration-200 flex items-center gap-2 border border-red-500/30"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden p-6 bg-gray-50">
          <div className="max-w-7xl mx-auto h-full">
            <Tabs defaultValue="inventory" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-4 mb-6 bg-white shadow-sm">
                <TabsTrigger value="inventory">Inventory</TabsTrigger>
                <TabsTrigger value="cart">Cart</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="requests">Requests History</TabsTrigger>
              </TabsList>

              {/* Inventory Tab */}
              <TabsContent value="inventory" className="flex-1 overflow-auto">
                <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-gray-800">
                      Inventory Items
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Available
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {inventory.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                              {item.name}
                            </td>
                            <td className="px-6 py-4 text-gray-700">
                              {item.description}
                            </td>
                            <td className="px-6 py-4 text-gray-700">
                              {item.remaining_quantity}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  item.status === "available"
                                    ? "bg-green-100 text-green-700"
                                    : item.status === "borrowed"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="number"
                                  min={1}
                                  max={item.remaining_quantity}
                                  value={selectedQuantities[item.id] || 1}
                                  onChange={(e) =>
                                    handleQuantityChange(
                                      item.id,
                                      parseInt(e.target.value) || 1
                                    )
                                  }
                                  className="w-16 px-2 py-1 border rounded-md text-sm"
                                  disabled={item.remaining_quantity <= 0}
                                />

                                <button
                                  onClick={() =>
                                    addToCart(
                                      item,
                                      selectedQuantities[item.id] || 1
                                    )
                                  }
                                  disabled={item.remaining_quantity <= 0}
                                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-md transform active:scale-90 hover:border-red-500 hover:text-red-500 active:text-green-500 border ${
                                    item.remaining_quantity <= 0
                                      ? "bg-gray-300 cursor-not-allowed text-black"
                                      : "bg-blue-500 hover:bg-red-600 text-blue-500"
                                  } transition-all duration-400`}
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                                  </svg>
                                  <span>Add to Cart</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              {/* Cart Tab */}
              <TabsContent value="cart" className="flex-1 overflow-auto">
                <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-gray-800">
                      Shopping Cart
                    </h2>
                    <button
                      onClick={fetchCart}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border text-blue-500 bg-blue-600  hover:scale-95  transition-all duration-200 ease-in-out rounded-md hover:bg-red-600 hover:text-red-500"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh Cart
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                            Item
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                            Quantity
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                            Return Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                            Actions
                          </th>
                        </tr>

                        {cartItems.map((item) => (
                          <tr
                            key={item.inventory_id}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-6 py-4">{item.inventory.name}</td>
                            <td className="px-6 py-4">{item.quantity}</td>
                            <td className="px-6 py-4">
                              <input
                                type="date"
                                value={
                                  item.return_date || getDefaultReturnDate()
                                }
                                min={new Date().toISOString().split("T")[0]}
                                onChange={(e) =>
                                  updateReturnDate(item.id, e.target.value)
                                }
                                className="px-2 py-1 border rounded-md text-sm"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <Button
                                onClick={() =>
                                  removeFromCart(item.inventory_id)
                                }
                                size="sm"
                                className="bg-red-300 text-black border border-red-400  hover:text-red-500 hover:border-black transition-all duration-200 ease-in-out hover:scale-90"
                              >
                                Remove
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </thead>
                      <tbody>
                        {/* {cartItems.map((item) => (
                          <tr
                            key={item.inventory_id}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-6 py-4">{item.inventory.name}</td>
                            <td className="px-6 py-4">{item.quantity}</td>
                            <td className="px-6 py-4">
                              <Button
                                onClick={() =>
                                  removeFromCart(item.inventory_id)
                                }
                                size="sm"
                                className="bg-red-300 text-black border border-red-400"
                              >
                                Remove
                              </Button>
                            </td>
                          </tr>
                        ))} */}
                      </tbody>
                    </table>
                    {cartItems.length > 0 && (
                      <div className="mt-6 flex justify-end">
                        <button
                          onClick={submitCartRequest}
                          disabled={cart?.status !== "draft"}
                          className={`px-4 py-2 font-medium rounded-md hover:text-black hover:border hover:border-red-500 active:scale-90 hover:scale-95 ${
                            cart?.status !== "draft"
                              ? "bg-gray-300 cursor-not-allowed"
                              : "bg-green-500 hover:bg-green-600 text-black"
                          }  text-red-500 transition-all duration-300 ease-in-out`}
                        >
                          Submit Request
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Transactions Tab */}
              <TabsContent
                value="transactions"
                className="flex-1 overflow-auto"
              >
                <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-gray-800">
                      Transaction History
                    </h2>
                    <div className="flex justify-between items-center mb-6">
                      <button
                        onClick={() => fetchTransactions()}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-600 text-amber-300 rounded-md hover:bg-blue-500 transition-colors"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Item
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Quantity Taken
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Damaged
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Fine
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Borrow Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Return Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Damage Image
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {transactions.map((transaction) => (
                          <tr
                            key={transaction.id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-6 py-4 text-gray-700">
                              {transaction.inventory?.name}
                            </td>
                            <td className="px-6 py-4 text-gray-700">
                              {transaction.quantity}
                            </td>
                            <td className="px-6 py-4 text-gray-700">
                              {transaction.damaged_quantity || 0}
                            </td>
                            <td className="px-6 py-4 text-gray-700">
                              {transaction.fine_amount ? (
                                <span className="text-red-600 font-medium">
                                  ${transaction.fine_amount.toFixed(2)}
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="px-6 py-4 text-gray-700">
                              {new Date(
                                transaction.borrow_date // ... existing code ...
                              ).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-gray-700">
                              {transaction.return_date
                                ? new Date(
                                    transaction.return_date
                                  ).toLocaleDateString()
                                : "-"}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  transaction.status === "returned"
                                    ? "bg-green-100 text-green-700"
                                    : transaction.status === "borrowed"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {transaction.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {transaction.damage_image_url ? (
                                <button
                                  onClick={() =>
                                    window.open(
                                      transaction.damage_image_url,
                                      "_blank"
                                    )
                                  }
                                  className="text-blue-500 hover:text-blue-700 transition-colors"
                                >
                                  <img
                                    src={transaction.damage_image_url}
                                    alt="Damage"
                                    className="w-10 h-10 object-cover rounded-md hover:opacity-80 transition-opacity"
                                  />
                                </button>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="requests" className="flex-1 overflow-auto">
                <RequestHistory userId={user.id} />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );}
