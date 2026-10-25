import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from './src/theme/colors';
import { getTabBarLayout } from './src/utils/navigationLayout';
import AddRecordScreen from './src/screens/AddRecordScreen';
import RecordsListScreen from './src/screens/RecordsListScreen';
import AppointmentsScreen from './src/screens/AppointmentsScreen';

const Tab = createBottomTabNavigator();

function AppTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarHideOnKeyboard: true,
      tabBarLabelPosition: 'below-icon',
      tabBarStyle: {
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        ...getTabBarLayout(insets),
      },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textSecondary,
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        if (route.name === 'Kayıt Ekle') iconName = focused ? 'add-circle' : 'add-circle-outline';
        else if (route.name === 'Liste') iconName = focused ? 'list' : 'list-outline';
        else if (route.name === 'Randevular') iconName = focused ? 'calendar' : 'calendar-outline';
        return <Ionicons name={iconName} size={size + 4} color={color} />;
      },
    })}>
      <Tab.Screen name="Randevular" component={AppointmentsScreen} />
      <Tab.Screen name="Kayıt Ekle" component={AddRecordScreen} />
      <Tab.Screen name="Liste" component={RecordsListScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <NavigationContainer><AppTabs /></NavigationContainer>
    </SafeAreaProvider>
  );
}
