"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { api } from "@/trpc/react";
import { agentToast } from "./agent-toast";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";
import Image from "next/image";

export function UserProfileForm() {
  const { publicKey } = useUser();
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profileImage, setProfileImage] = useState<string>("");

  const profileQuery = api.r2.getUserProfile.useQuery(
    { publicKey: publicKey! },
    { enabled: !!publicKey },
  );

  useEffect(() => {
    if (profileQuery.data) {
      setUsername(profileQuery.data.username ?? "");
      setBio(profileQuery.data.bio ?? "");
      setProfileImage(profileQuery.data.profilePicture ?? "");
    }
  }, [profileQuery.data]);

  const updateProfile = api.r2.updateUserProfile.useMutation({
    onSuccess: () => {
      agentToast.success("Profile updated successfully!");
      void profileQuery.refetch();
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result && typeof e.target.result === "string") {
          setProfileImage(e.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) return;

    updateProfile.mutate({
      publicKey,
      username,
      bio,
      profilePicture: profileImage,
    });
  };

  if (!publicKey) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-[#c0c0c0] p-4 shadow-[inset_-1px_-1px_#0a0a0a,inset_1px_1px_#fff]">
              <User className="h-8 w-8" />
            </div>
          </div>
          <p className="text-sm">
            Please connect your wallet to access your profile
          </p>
        </div>
      </div>
    );
  }

  if (profileQuery.isLoading) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <p className="text-sm">Loading profile...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <div className="mb-6 flex flex-col items-center">
        <div className="relative">
          {profileImage ? (
            <Image
              src={profileImage}
              alt="Profile"
              className="h-20 w-20 rounded-full border-2 border-[#c0c0c0] object-cover shadow-[inset_1px_1px_#0a0a0a,inset_-1px_-1px_#fff]"
              width={80}
              height={80}
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#c0c0c0] shadow-[inset_-1px_-1px_#0a0a0a,inset_1px_1px_#fff]">
              <User className="h-10 w-10" />
            </div>
          )}
          <label
            htmlFor="profile-image"
            className={cn(
              "absolute -bottom-2 left-1/2 -translate-x-1/2 cursor-pointer",
              "rounded bg-[#c0c0c0] px-2 py-1 font-chicago text-xs",
              "shadow-[inset_-1px_-1px_#0a0a0a,inset_1px_1px_#fff]",
              "hover:bg-[#d0d0d0] active:shadow-[inset_1px_1px_#0a0a0a,inset_-1px_-1px_#fff]",
            )}
          >
            Change
          </label>
          <input
            id="profile-image"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center">
          <label className="w-24 font-chicago text-sm">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={cn(
              "flex-1 rounded bg-white px-2 py-1 text-sm",
              "shadow-[inset_1px_1px_#0a0a0a,inset_-1px_-1px_#fff]",
              "focus:outline-none",
            )}
            placeholder="Enter your username"
            required
          />
        </div>

        <div className="flex">
          <label className="w-24 font-chicago text-sm">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className={cn(
              "flex-1 rounded bg-white px-2 py-1 text-sm",
              "shadow-[inset_1px_1px_#0a0a0a,inset_-1px_-1px_#fff]",
              "h-32 resize-none focus:outline-none",
            )}
            placeholder="Tell us about yourself..."
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={updateProfile.isPending}
          className={cn(
            "rounded border border-black bg-[#00009e] px-4 py-1.5 font-chicago text-sm text-white",
            "transition-colors hover:bg-blue-600 disabled:opacity-50",
            "shadow-[inset_1px_1px_#ffffff40] disabled:cursor-not-allowed",
          )}
        >
          {updateProfile.isPending ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </form>
  );
}
