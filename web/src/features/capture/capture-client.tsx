"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, ImagePlus, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { db } from "@/lib/dexie";

type CaptureState = "idle" | "streaming" | "captured" | "saved" | "error";

async function blobFromVideo(video: HTMLVideoElement): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const videoWidth = video.videoWidth || 1024;
  const videoHeight = video.videoHeight || 768;
  const maxDimension = 1024;
  const scale = Math.min(1, maxDimension / Math.max(videoWidth, videoHeight));

  canvas.width = Math.round(videoWidth * scale);
  canvas.height = Math.round(videoHeight * scale);

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Camera canvas is unavailable.");
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Unable to capture image."));
        }
      },
      "image/jpeg",
      0.8,
    );
  });
}

export function CaptureClient() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CaptureState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (photoUrl) {
        URL.revokeObjectURL(photoUrl);
      }
    };
  }, [photoUrl]);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setState("streaming");
    } catch (caught) {
      setState("error");
      setError(
        caught instanceof Error
          ? caught.message
          : "Camera access failed. Manual entry still works.",
      );
    }
  }

  async function capturePhoto() {
    if (!videoRef.current) {
      return;
    }

    const nextBlob = await blobFromVideo(videoRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    const nextUrl = URL.createObjectURL(nextBlob);
    setPhotoBlob(nextBlob);
    setPhotoUrl(nextUrl);
    setState("captured");
  }

  async function saveItem() {
    const now = new Date().toISOString();
    const itemId = crypto.randomUUID();

    await db.items.add({
      id: itemId,
      householdId: "local",
      locationId: "unsorted",
      name: name.trim(),
      notes: notes.trim() || null,
      quantity: 1,
      useCount: 0,
      lastUsedAt: null,
      primaryPhotoBlob: photoBlob,
      createdAt: now,
      updatedAt: now,
      syncStatus: "pending",
    });

    await db.pendingSyncOperations.add({
      id: crypto.randomUUID(),
      operation: "insert",
      tableName: "items",
      payload: { itemId },
      retryCount: 0,
      createdAt: now,
    });

    setState("saved");
  }

  function resetCapture() {
    if (photoUrl) {
      URL.revokeObjectURL(photoUrl);
    }
    setPhotoBlob(null);
    setPhotoUrl(null);
    setState("idle");
  }

  return (
    <main className="px-4 py-5">
      <div className="mx-auto grid w-full max-w-md gap-4">
        <div>
          <p className="text-sm font-semibold text-zinc-600">Add Item</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Capture first, name later.
          </h1>
        </div>

        <GlassPanel className="overflow-hidden">
          <div className="aspect-[4/5] bg-zinc-950">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt="Captured item"
                className="h-full w-full object-cover"
              />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div className="grid gap-3 p-4">
            {state === "saved" ? (
              <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
                <Check className="size-4" aria-hidden="true" />
                Saved locally. Cloud sync comes next.
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                {error}
              </div>
            ) : null}

            {state === "streaming" ? (
              <Button onClick={capturePhoto}>
                <Camera className="size-4" aria-hidden="true" />
                Take photo
              </Button>
            ) : null}

            {state === "idle" || state === "error" ? (
              <Button onClick={startCamera}>
                <ImagePlus className="size-4" aria-hidden="true" />
                Open camera
              </Button>
            ) : null}

            {state === "captured" ? (
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={resetCapture}>
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Retake
                </Button>
                <Button onClick={saveItem}>
                  <Save className="size-4" aria-hidden="true" />
                  Save
                </Button>
              </div>
            ) : null}
          </div>
        </GlassPanel>

        <GlassPanel className="grid gap-3 p-4">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="hammer, charger, passport..."
              className="h-12 rounded-2xl border border-zinc-950/10 bg-white/75 px-4 outline-none focus:border-zinc-950/30"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Model number, where it came from, warranty..."
              className="min-h-24 rounded-2xl border border-zinc-950/10 bg-white/75 px-4 py-3 outline-none focus:border-zinc-950/30"
            />
          </label>
          {state !== "captured" && state !== "saved" ? (
            <Button variant="secondary" onClick={saveItem}>
              Save manual item
            </Button>
          ) : null}
        </GlassPanel>
      </div>
    </main>
  );
}
