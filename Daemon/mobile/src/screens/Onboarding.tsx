import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";

const { width } = Dimensions.get("window");

const slides = [
  {
    title: "Welcome to Daemon",
    description:
      "Modern onboarding experience with Poppins-inspired styling. Swipe to continue.",
  },
  {
    title: "Everything you need",
    description:
      "Get started quickly. Continue to login with your Solana wallet.",
  },
];

type Props = NativeStackScreenProps<RootStackParamList, "Onboarding">;

export default function Onboarding({ navigation }: Props) {
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const go = (i: number) => {
    setIndex(i);
    listRef.current?.scrollToIndex({ index: i, animated: true });
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(i);
        }}
        renderItem={({ item }) => (
          <View style={{ width, paddingHorizontal: 24 }}>
            <View style={styles.card}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            disabled={index === 0}
            onPress={() => go(index - 1)}
            style={[styles.button, index === 0 && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>
          {index < slides.length - 1 ? (
            <TouchableOpacity
              onPress={() => go(index + 1)}
              style={[styles.button, styles.buttonPrimary]}
            >
              <Text style={[styles.buttonText, styles.buttonPrimaryText]}>
                Next
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => navigation.navigate("LoginSolana")}
              style={[styles.button, styles.buttonPrimary]}
            >
              <Text style={[styles.buttonText, styles.buttonPrimaryText]}>
                Login with Solana
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7ff",
  },
  card: {
    marginTop: 120,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#667085",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 24,
    paddingHorizontal: 24,
    gap: 12,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D0D5DD",
  },
  dotActive: {
    backgroundColor: "#4F46E5",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E4E7EC",
    backgroundColor: "#ffffff",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPrimary: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  buttonPrimaryText: {
    color: "#ffffff",
  },
});

export {};
