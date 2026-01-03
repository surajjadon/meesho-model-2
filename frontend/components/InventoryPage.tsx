import React, { useEffect, useState } from 'react';
import { useBusiness } from '@/providers/GlobalProvider';
import api from '../lib/api';

// Matches your IInventoryItem backend model
interface InventoryItem {
  _id: string;
  title: string;
  stock: number;
  price: number;
}

const InventoryPage = () => {
  const { selectedBusiness, loading: businessLoading } = useBusiness();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchInventory = async () => {
      if (selectedBusiness) {
        try {
          setLoading(true);
          // The 'x-gstin' header is added automatically by our api instance!
          const res = await api.get('/inventory');
          setInventory(res.data);
        } catch (error) {
          console.error("Failed to fetch inventory", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchInventory();
  }, [selectedBusiness]); // Refetch when the user changes business

  if (businessLoading) return <div>Loading businesses...</div>;
  if (!selectedBusiness) return <div>Please add and select a business profile to view inventory.</div>;

  return (
    <div>
      <h1>Inventory for {selectedBusiness.brandName}</h1>
      {/* Add New Item Button would go here */}
      
      {loading ? (
        <div>Loading inventory...</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Stock</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map(item => (
              <tr key={item._id}>
                <td>{item.title}</td>
                <td>{item.stock}</td>
                <td>{item.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default InventoryPage;