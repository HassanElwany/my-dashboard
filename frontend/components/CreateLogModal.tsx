"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";

export default function CreateLogModal({ onLogCreated }: { onLogCreated: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [weight, setWeight] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    try {
      const res = await fetch("http://localhost:8000/logs/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: date,
          current_weight: weight ? parseFloat(weight) : null,
        }),
      });

      if (!res.ok) throw new Error("Log might already exist for this date.");

      setOpen(false); // Close the modal
      onLogCreated(); // Trigger the dashboard refresh
      setWeight("");  // Clear the form
    } catch (err) {
      alert("Failed to create log. You might already have a log for this date!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Start New Day</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Track a New Day</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input 
              id="date" 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight">Morning Weight (kg) - Optional</Label>
            <Input 
              id="weight" 
              type="number" 
              step="0.1" 
              placeholder="e.g. 85.5"
              value={weight} 
              onChange={(e) => setWeight(e.target.value)} 
            />
          </div>
          <Button type="submit" className="w-full">Save Log</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}