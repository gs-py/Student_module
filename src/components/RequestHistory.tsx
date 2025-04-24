import { useEffect, useState } from "react";
import supabase from "../supabase";
import { RefreshCw } from "lucide-react";

interface RequestHistoryProps {
  userId: string;
}

interface CartRequest {
  id: number;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  items: {
    id: number;
    quantity: number;
    return_date: string | null;
    inventory: {
      name: string;
      description: string;
    };
  }[];
}

export default function RequestHistory({ userId }: RequestHistoryProps) {
  const [requests, setRequests] = useState<CartRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const { data: borrowerData } = await supabase
        .from("borrowers")
        .select("id")
        .eq("auth_id", userId)
        .single();

      if (!borrowerData) return;

      const { data, error } = await supabase
        .from("cart")
        .select(`
          id,
          status,
          created_at,
          reviewed_at,
          items:cart_items (
            id,
            quantity,
            return_date,
            inventory:inventory_id (
              name,
              description
            )
          )
        `)
        .eq("borrower_id", borrowerData.id)
        .not("status", "eq", "draft")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [userId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "requested":
        return "bg-blue-100 text-blue-700";
      case "accepted":
        return "bg-green-100 text-green-700";
      case "rejected":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Request History</h2>
        <button
          onClick={fetchRequests}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-500 border border-blue-500 rounded-md hover:bg-blue-50 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No request history found
        </div>
      ) : (
        <div className="space-y-6">
          {requests.map((request) => (
            <div
              key={request.id}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <div className="bg-gray-50 px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    Request #{request.id}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      request.status
                    )}`}
                  >
                    {request.status.charAt(0).toUpperCase() +
                      request.status.slice(1)}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(request.created_at).toLocaleDateString()}
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {request.items.map((item) => (
                  <div
                    key={item.id}
                    className="px-4 py-3 flex justify-between items-center hover:bg-gray-50"
                  >
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {item.inventory.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {item.inventory.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Qty:</span> {item.quantity}
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Return:</span>{" "}
                        {item.return_date
                          ? new Date(item.return_date).toLocaleDateString()
                          : "N/A"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {request.reviewed_at && (
                <div className="bg-gray-50 px-4 py-2 text-sm text-gray-500">
                  Reviewed on:{" "}
                  {new Date(request.reviewed_at).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}