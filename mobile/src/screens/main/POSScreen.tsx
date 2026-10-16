/**
 * POS Screen
 * 
 * Mobile point-of-sale for creating sales transactions
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

const POSScreen = () => {
  const [cart, setCart] = useState<CartItem[]>([]);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleAddItem = () => {
    Alert.alert('Add Item', 'Product selection will be implemented');
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCart(prevCart =>
      prevCart
        .map(item =>
          item.id === id
            ? {...item, quantity: Math.max(0, item.quantity + delta)}
            : item,
        )
        .filter(item => item.quantity > 0),
    );
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      Alert.alert('Error', 'Cart is empty');
      return;
    }

    Alert.alert('Checkout', 'Payment processing will be implemented', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Confirm',
        onPress: () => {
          setCart([]);
          Alert.alert('Success', 'Sale completed successfully');
        },
      },
    ]);
  };

  const renderCartItem = ({item}: {item: CartItem}) => (
    <View style={styles.cartItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>₹{item.price.toFixed(2)}</Text>
      </View>
      <View style={styles.quantityControls}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => handleUpdateQuantity(item.id, -1)}>
          <Icon name="minus" size={20} color="#3b82f6" />
        </TouchableOpacity>
        <Text style={styles.quantity}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => handleUpdateQuantity(item.id, 1)}>
          <Icon name="plus" size={20} color="#3b82f6" />
        </TouchableOpacity>
      </View>
      <Text style={styles.itemTotal}>
        ₹{(item.price * item.quantity).toFixed(2)}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
          <Icon name="barcode-scan" size={24} color="#3b82f6" />
          <Text style={styles.addButtonText}>Scan or Search Product</Text>
        </TouchableOpacity>

        {cart.length === 0 ? (
          <View style={styles.emptyCart}>
            <Icon name="cart-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>Cart is empty</Text>
            <Text style={styles.emptySubtext}>
              Scan or add products to start a sale
            </Text>
          </View>
        ) : (
          <FlatList
            data={cart}
            renderItem={renderCartItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.cartList}
          />
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalAmount}>₹{total.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.checkoutButton, cart.length === 0 && styles.buttonDisabled]}
          onPress={handleCheckout}
          disabled={cart.length === 0}>
          <Text style={styles.checkoutButtonText}>Proceed to Payment</Text>
          <Icon name="arrow-right" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    margin: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
    marginLeft: 8,
  },
  emptyCart: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  cartList: {
    padding: 12,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: '#6b7280',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginHorizontal: 12,
    minWidth: 24,
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
    minWidth: 80,
    textAlign: 'right',
  },
  footer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: 16,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6b7280',
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
  },
  buttonDisabled: {
    backgroundColor: '#d1d5db',
  },
  checkoutButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginRight: 8,
  },
});

export default POSScreen;
