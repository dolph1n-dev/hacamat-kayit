import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Keyboard, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function KeyboardToolbar() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // iOS ve Android için doğru eventleri dinliyoruz
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const keyboardDidShowListener = Keyboard.addListener(showEvent, () => setIsVisible(true));
    const keyboardDidHideListener = Keyboard.addListener(hideEvent, () => setIsVisible(false));

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  if (!isVisible) return null;

  return (
    <View style={styles.toolbar}>
      <TouchableOpacity style={styles.button} onPress={() => Keyboard.dismiss()}>
        <Text style={styles.text}>Klavyeyi Kapat</Text>
        <Ionicons name="chevron-down" size={20} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    width: '100%',
    backgroundColor: colors.inputBackground,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 6,
  }
});