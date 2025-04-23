import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import supabase from "./supabase";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw } from "lucide-react";

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
}

export default function Dashboard({ user }: DashboardProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventory();
    fetchTransactions();
  }, []);

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

//   const fetchTransactions = async () => {
//     try {
//       const { data, error } = await supabase
//         .from('transactions')
//         .select(`
//           *,
//           inventory:inventory_id (*)
//         `)
//         .order('borrow_date', { ascending: false });

//       if (error) throw error;
//       setTransactions(data || []);
//     } catch (error) {
//       console.error('Error fetching transactions:', error);
//     } finally {
//       setLoading(false);
//     }
//   };
const fetchTransactions = async () => {
  try {
    // Get logged-in user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("Unable to fetch authenticated user");
    }

    // Fetch the borrower ID linked to the logged-in user's auth ID
    const { data: borrowerData, error: borrowerError } = await supabase
      .from("borrowers")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (borrowerError || !borrowerData) {
      throw new Error("Borrower not found");
    }

    const borrowerId = borrowerData.id;

    // Fetch transactions only for this borrower
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Update the loading screen
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin">
          <RefreshCw className="h-8 w-8 text-blue-600" />
        </div>
        <p className="mt-4 text-gray-600 font-medium">Loading your data...</p>
      </div>
    );
  }

  // Update the Transaction History header section
 
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 min-w-screen">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 shadow-sm px-6 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Inventory System
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">{user.email}</span>
              <Button
                onClick={handleLogout}
                variant="destructive"
                size="sm"
                className="bg-red-500 hover:bg-red-600"
              >
                Logout
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden p-6 bg-gray-50">
          <div className="max-w-7xl mx-auto h-full">
            <Tabs defaultValue="inventory" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-white shadow-sm">
                <TabsTrigger
                  value="inventory"
                  className="data-[state=active]:bg-white data-[state=active]:text-amber-600 text-white"
                >
                  Inventory
                </TabsTrigger>
                <TabsTrigger
                  value="transactions"
                  className="data-[state=active]:bg-white data-[state=active]:text-amber-600 text-white"
                >
                  Transactions
                </TabsTrigger>
              </TabsList>

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
                          {/* <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Total Quantity
                          </th> */}
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Available
                          </th>
                          {/* <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Location
                          </th> */}
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Status
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
                            {/* <td className="px-6 py-4 text-gray-700">
                              {item.quantity}
                            </td> */}
                            <td className="px-6 py-4 text-gray-700">
                              {item.remaining_quantity}
                            </td>
                            {/* <td className="px-6 py-4 text-gray-700">
                              {item.location}
                            </td> */}
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

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
                      <Button
                        onClick={() => fetchTransactions()}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 bg-blue-400 text-white hover:text-green-500 hover:scale-101"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                      </Button>
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
                            Borrow Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Return Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Status
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
                              {new Date(
                                transaction.borrow_date
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
