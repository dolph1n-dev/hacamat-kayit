import React from 'react';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from './src/theme/colors';

import AddRecordScreen from './src/screens/AddRecordScreen';
import RecordsListScreen from './src/screens/RecordsListScreen';
import AppointmentsScreen from './src/screens/AppointmentsScreen';

import { registerForPushNotificationsAsync } from './src/utils/notifications';

const Tab = createBottomTabNavigator();

export default function App() {
  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarStyle: {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              paddingBottom: 5,
              paddingTop: 5,
              height: 60,
            },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textSecondary,
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;
              if (route.name === 'Kayıt Ekle') iconName = focused ? 'add-circle' : 'add-circle-outline';
              else if (route.name === 'Liste') iconName = focused ? 'list' : 'list-outline';
              return <Ionicons name={iconName} size={size + 4} color={color} />;
            },
          })}
        >
          <Tab.Screen name="Randevular" component={AppointmentsScreen} />
          <Tab.Screen name="Kayıt Ekle" component={AddRecordScreen} />
          <Tab.Screen name="Liste" component={RecordsListScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}