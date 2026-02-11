// Snippet to add to OrderDetails - state (after invoiceRef):
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [addItemCurrentItem, setAddItemCurrentItem] = useState(null);
  const [addItemProducts, setAddItemProducts] = useState([]);
  const [addItemMaterials, setAddItemMaterials] = useState([]);
  const [addItemProductSearch, setAddItemProductSearch] = useState('');
  const [addItemProductPage, setAddItemProductPage] = useState(1);
  const [addItemMaterialPage, setAddItemMaterialPage] = useState(1);
  const [addItemSubmitting, setAddItemSubmitting] = useState(false);
  const pricingCalculator = usePricingCalculator();
  const canEditOrder = order && !['dispatched', 'delivered', 'cancelled'].includes(order.status);
