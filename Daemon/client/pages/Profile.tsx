import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Upload, Camera, Save, X } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useWallet } from "@/hooks/useWallet";
import { useProfilePicture } from "@/hooks/useProfilePicture";
import { smartTruncateAddress } from "@/lib/walletUtils";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function Profile() {
  const { isDark } = useTheme();
  const { wallet } = useWallet();
  const { profileImage, saveProfileImage, removeProfileImage } = useProfilePicture();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing profile data
  useEffect(() => {
    const walletAddress = wallet?.address;
    if (walletAddress) {
      const savedUserName = localStorage.getItem(`username_${walletAddress}`);

      if (savedUserName) {
        setUserName(savedUserName);
      } else {
        // Default username based on wallet address
        setUserName(smartTruncateAddress(walletAddress, 'desktop'));
      }
    }
  }, [wallet?.address]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }

      setIsUploading(true);
      const reader = new FileReader();

      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPreviewImage(result);
        setIsUploading(false);
      };

      reader.onerror = () => {
        alert('Error reading file');
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
    const walletAddress = wallet?.address;

    if (walletAddress && previewImage) {
      // Save profile image using the hook
      const success = saveProfileImage(previewImage);
      if (success) {
        setPreviewImage(null);
      }
    }

    if (walletAddress && userName) {
      // Save username
      localStorage.setItem(`username_${walletAddress}`, userName);
    }
  };

  const handleCancelUpload = () => {
    setPreviewImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveProfileImage = () => {
    const success = removeProfileImage();
    if (success) {
      setPreviewImage(null);
    }
  };

  const copyAddress = async () => {
    const walletAddress = wallet?.address;
    if (walletAddress) {
      try {
        await navigator.clipboard.writeText(walletAddress);
        // Simple feedback by changing button text temporarily
        const button = document.querySelector('#copy-address-btn') as HTMLButtonElement;
        if (button) {
          const originalText = button.textContent;
          button.textContent = 'Copied!';
          button.className = button.className.replace('outline', 'default');
          setTimeout(() => {
            button.textContent = originalText;
            button.className = button.className.replace('default', 'outline');
          }, 2000);
        }
      } catch (err) {
        console.error('Failed to copy address:', err);
      }
    }
  };

  if (!wallet?.address) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className={`w-full max-w-md ${isDark ? 'bg-slate-900/95 border-slate-700/50' : 'bg-white border-slate-200'} mobile-shadow`}>
          <CardContent className={cn(
            "p-6 text-center",
            isDark ? "text-white" : "text-slate-900"
          )}>
            <User className={cn(
              "w-16 h-16 mx-auto mb-4",
              isDark ? "text-slate-400" : "text-slate-600"
            )} />
            <h2 className="text-xl font-semibold mb-2">Wallet Not Connected</h2>
            <p className={cn(
              "text-sm",
              isDark ? "text-slate-400" : "text-slate-600"
            )}>
              Please connect your wallet to view your profile.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 mobile-container mobile-scroll">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mobile-gpu"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-8 bg-gradient-to-b from-primary to-primary/60 rounded-full"></div>
            <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'} amoled-text`}>
              Profile
            </h1>
          </div>
          <p className={`text-sm sm:text-base ${isDark ? 'text-slate-300' : 'text-slate-600'} ml-4`}>
            Manage your profile information and preferences
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="mobile-gpu"
        >
          <Card className={cn(
            "overflow-hidden mobile-shadow border-2",
            isDark
              ? "bg-gradient-to-br from-slate-900/95 to-slate-800/95 border-primary/20"
              : "bg-gradient-to-br from-white to-slate-50/50 border-primary/10"
          )}>
            <CardHeader className={cn(
              "text-center pb-4 sm:pb-6 relative",
              isDark ? "text-white" : "text-slate-900"
            )}>
              {/* Profile section indicator */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/60"></div>

              <div className="relative inline-block mobile-gpu mt-4">
                {previewImage || profileImage ? (
                  <img
                    src={previewImage || profileImage!}
                    alt="Profile"
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover mx-auto border-4 border-primary/30 mobile-gpu ring-4 ring-primary/10"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center mx-auto mobile-gpu shadow-lg">
                    <User className="w-10 h-10 sm:w-12 sm:h-12 text-white drop-shadow-md" />
                  </div>
                )}

                {/* Upload button overlay */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2.5 rounded-full bg-primary text-white hover:bg-primary/90 transition-all duration-200 mobile-shadow press-feedback ring-4 ring-white/20 dark:ring-slate-900/50"
                  title="Upload profile picture"
                >
                  {isUploading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              <CardTitle className="mt-4 sm:mt-5 text-lg sm:text-xl bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent font-semibold">
                Profile Picture
              </CardTitle>
              <CardDescription className={cn(
                "text-xs sm:text-sm mt-1",
                isDark ? "text-slate-300" : "text-slate-600"
              )}>
                Upload a profile picture to personalize your account
              </CardDescription>
            </CardHeader>

            {previewImage && (
              <CardContent className="pt-0 pb-6 bg-gradient-to-b from-transparent to-primary/5 dark:to-primary/10">
                <div className="flex justify-center gap-3">
                  <Button
                    onClick={handleSaveProfile}
                    className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white border-0 shadow-lg press-feedback"
                    disabled={isUploading}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Picture
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancelUpload}
                    disabled={isUploading}
                    className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 press-feedback"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            )}

            {profileImage && !previewImage && (
              <CardContent className="pt-0 pb-6">
                <div className="flex justify-center">
                  <Button
                    variant="destructive"
                    onClick={handleRemoveProfileImage}
                    size="sm"
                    className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 border-0 shadow-md press-feedback"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove Picture
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mobile-gpu"
        >
          <Card className={cn(
            "mobile-shadow border-2",
            isDark
              ? "bg-gradient-to-br from-slate-900/95 to-slate-800/95 border-slate-700/50"
              : "bg-gradient-to-br from-white to-slate-50/50 border-slate-200"
          )}>
            <CardHeader className={cn(
              "relative",
              isDark ? "text-white" : "text-slate-900"
            )}>
              {/* Wallet section indicator */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400"></div>

              <div className="flex items-center gap-3 mt-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <div className="w-4 h-4 bg-white rounded-sm"></div>
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-xl">Wallet Information</CardTitle>
                  <CardDescription className={cn(
                    "text-xs sm:text-sm mt-1",
                    isDark ? "text-slate-300" : "text-slate-600"
                  )}>
                    Your connected wallet details
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-5">
              <div>
                <Label htmlFor="wallet-address" className={cn(
                  "text-xs sm:text-sm font-medium flex items-center gap-2",
                  isDark ? "text-slate-200" : "text-slate-700"
                )}>
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  Wallet Address
                </Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    id="wallet-address"
                    value={wallet.address}
                    readOnly
                    className={cn(
                      "font-mono text-xs sm:text-sm flex-1 border-2",
                      isDark
                        ? "bg-slate-800/60 border-slate-700/50 text-slate-200 focus:border-blue-500/50"
                        : "bg-slate-50/50 border-slate-200/50 text-slate-700 focus:border-blue-500/30"
                    )}
                  />
                  <Button
                    id="copy-address-btn"
                    variant="outline"
                    size="sm"
                    onClick={copyAddress}
                    title="Copy address"
                    className="press-feedback border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="username" className={cn(
                  "text-xs sm:text-sm font-medium flex items-center gap-2",
                  isDark ? "text-slate-200" : "text-slate-700"
                )}>
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  Display Name
                </Label>
                <Input
                  id="username"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your display name"
                  className={cn(
                    "mt-2 text-sm border-2",
                    isDark
                      ? "bg-slate-800/60 border-slate-700/50 text-slate-100 placeholder:text-slate-400 focus:border-green-500/50"
                      : "bg-white/50 border-slate-200/50 text-slate-700 placeholder:text-slate-400 focus:border-green-500/30"
                  )}
                />
                <p className={cn(
                  "text-xs mt-2 ml-3 flex items-center gap-1",
                  isDark ? "text-slate-400" : "text-slate-500"
                )}>
                  <div className="w-1 h-1 rounded-full bg-current opacity-50"></div>
                  This name will be displayed in your profile and chat
                </p>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleSaveProfile}
                  className={cn(
                    "w-full h-10 sm:h-11 press-feedback border-0",
                    userName.trim()
                      ? "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary shadow-lg"
                      : "bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  )}
                  disabled={!userName.trim()}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="mobile-gpu"
        >
          <Card className={cn(
            "mobile-shadow border-2",
            isDark
              ? "bg-gradient-to-br from-slate-900/95 to-slate-800/95 border-slate-700/50"
              : "bg-gradient-to-br from-white to-slate-50/50 border-slate-200"
          )}>
            <CardHeader className={cn(
              "relative",
              isDark ? "text-white" : "text-slate-900"
            )}>
              {/* Statistics section indicator */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-purple-500 to-purple-400"></div>

              <div className="flex items-center gap-3 mt-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <div className="w-4 h-1 bg-white rounded-full"></div>
                  <div className="w-4 h-1 bg-white rounded-full -translate-y-2"></div>
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-xl">Profile Statistics</CardTitle>
                  <CardDescription className={cn(
                    "text-xs sm:text-sm mt-1",
                    isDark ? "text-slate-300" : "text-slate-600"
                  )}>
                    Your activity overview
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div className={cn(
                  "text-center p-4 sm:p-5 rounded-xl border-2 relative overflow-hidden group transition-all duration-300 hover:scale-105",
                  isDark
                    ? "bg-gradient-to-br from-blue-600/10 to-blue-600/5 border-blue-500/20 hover:border-blue-500/40"
                    : "bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/50 hover:border-blue-300/60"
                )}>
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative">
                    <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">0</div>
                    <div className={cn(
                      "text-sm font-medium mt-1 flex items-center justify-center gap-1",
                      isDark ? "text-blue-300" : "text-blue-700"
                    )}>
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      Total Chats
                    </div>
                  </div>
                </div>
                <div className={cn(
                  "text-center p-4 sm:p-5 rounded-xl border-2 relative overflow-hidden group transition-all duration-300 hover:scale-105",
                  isDark
                    ? "bg-gradient-to-br from-green-600/10 to-green-600/5 border-green-500/20 hover:border-green-500/40"
                    : "bg-gradient-to-br from-green-50 to-green-100/50 border-green-200/50 hover:border-green-300/60"
                )}>
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative">
                    <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent">0</div>
                    <div className={cn(
                      "text-sm font-medium mt-1 flex items-center justify-center gap-1",
                      isDark ? "text-green-300" : "text-green-700"
                    )}>
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      Audits Completed
                    </div>
                  </div>
                </div>
                <div className={cn(
                  "text-center p-4 sm:p-5 rounded-xl border-2 relative overflow-hidden group transition-all duration-300 hover:scale-105",
                  isDark
                    ? "bg-gradient-to-br from-purple-600/10 to-purple-600/5 border-purple-500/20 hover:border-purple-500/40"
                    : "bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200/50 hover:border-purple-300/60"
                )}>
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative">
                    <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">0</div>
                    <div className={cn(
                      "text-sm font-medium mt-1 flex items-center justify-center gap-1",
                      isDark ? "text-purple-300" : "text-purple-700"
                    )}>
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                      Days Active
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
  );
}