import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { signNonceWithSMWA } from "../solana/smwa";

const API = "https://daemonprotocol-be-production.up.railway.app";

type Props = NativeStackScreenProps<RootStackParamList, "LoginSolana">;

export default function LoginSolana({ navigation }: Props) {
  const [address, setAddress] = useState("");
  const [nonce, setNonce] = useState("");
  const [signature, setSignature] = useState("");
  const [loading, setLoading] = useState(false);

  const getNonce = async () => {
    if (!address) {
      Alert.alert("Missing address", "Enter your wallet address");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/nonce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chain: "solana", address }),
      });
      const data = await res.json();
      setNonce(String(data.nonce ?? ""));
    } catch (e) {
      Alert.alert("Error", "Failed to fetch nonce");
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (!address || !nonce || !signature) {
      Alert.alert("Missing data", "Provide address, nonce and signature");
      return;
    }
    setLoading(true);
    try {
      const message = `Sign in to Daemon Protocol\nNonce: ${nonce}`;
      const res = await fetch(`${API}/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chain: "solana",
          address,
          nonce,
          message,
          signature,
        }),
      });
      const data = await res.json();
      if (data?.token) {
        Alert.alert("Success", "Authenticated");
        navigation.replace("Onboarding");
      } else {
        Alert.alert("Failed", "Verification failed");
      }
    } catch (e) {
      Alert.alert("Error", "Verification error");
    } finally {
      setLoading(false);
    }
  };

  const connectWallet = async () => {
    Alert.alert(
      "Connect Wallet",
      "Mobile wallet integration (Phantom deep link or SMWA) can be added. For now, paste your signature below after signing the nonce message in your wallet.",
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Login with Solana</Text>
        <Text style={styles.subtitle}>
          Connect your wallet, fetch a nonce, and sign the message.
        </Text>

        <TouchableOpacity
          style={[styles.button, styles.secondary]}
          onPress={connectWallet}
        >
          <Text style={styles.buttonText}>Connect Phantom</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Address (base58)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your public key"
          value={address}
          onChangeText={setAddress}
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.button, !address && styles.disabled]}
          onPress={getNonce}
          disabled={!address || loading}
        >
          <Text style={styles.buttonText}>Get Nonce</Text>
        </TouchableOpacity>

        {nonce ? (
          <>
            <Text style={[styles.label, { marginTop: 12 }]}>
              Message to sign
            </Text>
            <View style={styles.textarea}>
              <Text>{`Sign in to Daemon Protocol\nNonce: ${nonce}`}</Text>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.primary]}
              onPress={async () => {
                try {
                  const { address: addr, signatureBase58 } =
                    await signNonceWithSMWA(nonce);
                  setAddress(addr);
                  setSignature(signatureBase58);
                  await verify();
                } catch (e) {
                  Alert.alert("Wallet", "Signing canceled or failed");
                }
              }}
            >
              <Text style={[styles.buttonText, styles.primaryText]}>
                Sign with Wallet (SMWA)
              </Text>
            </TouchableOpacity>

            <Text style={[styles.label, { marginTop: 12 }]}>
              Signature (Base58)
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Paste signature"
              value={signature}
              onChangeText={setSignature}
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[
                styles.button,
                styles.primary,
                (!signature || loading) && styles.disabled,
              ]}
              onPress={verify}
              disabled={!signature || loading}
            >
              <Text style={[styles.buttonText, styles.primaryText]}>
                Verify
              </Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 6,
    color: "#6B7280",
  },
  label: {
    marginTop: 12,
    marginBottom: 6,
    fontWeight: "600",
    fontSize: 12,
    color: "#111827",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  textarea: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#F9FAFB",
  },
  button: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  primary: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  primaryText: {
    color: "#fff",
  },
  secondary: {
    backgroundColor: "#F3F4F6",
  },
  disabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontWeight: "600",
  },
});

export {};
