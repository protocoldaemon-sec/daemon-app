import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import Onboarding from "./src/screens/Onboarding";
import LoginSolana from "./src/screens/LoginSolana";

export type RootStackParamList = {
  Onboarding: undefined;
  LoginSolana: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        initialRouteName="Onboarding"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Onboarding" component={Onboarding} />
        <Stack.Screen name="LoginSolana" component={LoginSolana} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
