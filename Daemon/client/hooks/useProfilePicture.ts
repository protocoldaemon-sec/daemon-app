import { useState, useEffect } from 'react';
import { useWallet } from './useWallet';

export function useProfilePicture() {
  const { wallet } = useWallet();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const walletAddress = wallet?.address;

  // Load profile image from localStorage
  useEffect(() => {
    if (walletAddress) {
      const savedProfileImage = localStorage.getItem(`profile_image_${walletAddress}`);
      if (savedProfileImage) {
        setProfileImage(savedProfileImage);
      }
    }
  }, [walletAddress]);

  // Save profile image to localStorage
  const saveProfileImage = (imageData: string) => {
    if (!walletAddress) return false;

    try {
      localStorage.setItem(`profile_image_${walletAddress}`, imageData);
      setProfileImage(imageData);

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('profilePictureUpdated', {
        detail: {
          walletAddress,
          profileImage: imageData
        }
      }));

      return true;
    } catch (error) {
      console.error('Failed to save profile image:', error);
      return false;
    }
  };

  // Remove profile image
  const removeProfileImage = () => {
    if (!walletAddress) return false;

    try {
      localStorage.removeItem(`profile_image_${walletAddress}`);
      setProfileImage(null);

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('profilePictureUpdated', {
        detail: {
          walletAddress,
          profileImage: null
        }
      }));

      return true;
    } catch (error) {
      console.error('Failed to remove profile image:', error);
      return false;
    }
  };

  // Listen for profile picture updates from other components
  useEffect(() => {
    const handleProfilePictureUpdate = (event: CustomEvent) => {
      const { walletAddress: updatedWallet, profileImage: updatedImage } = event.detail;

      if (updatedWallet === walletAddress) {
        setProfileImage(updatedImage);
      }
    };

    window.addEventListener('profilePictureUpdated', handleProfilePictureUpdate as EventListener);

    return () => {
      window.removeEventListener('profilePictureUpdated', handleProfilePictureUpdate as EventListener);
    };
  }, [walletAddress]);

  return {
    profileImage,
    isLoading,
    saveProfileImage,
    removeProfileImage,
    hasProfileImage: !!profileImage
  };
}