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

// We pass the specific logId so the backend knows WHICH day to add the meal to
export default function AddMealModal({ logId, onMealAdded }: { logId: number, onMealAdded: () => void }) {
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    try {
      // Notice the URL includes the specific logId!
      const res = await fetch(`http://localhost:8000/logs/${logId}/meals/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          calories: parseInt(calories),
          protein: protein ? parseFloat(protein) : 0,
          carbs: carbs ? parseFloat(carbs) : 0,
          fats: fats ? parseFloat(fats) : 0,
        }),
      });

      if (!res.ok) throw new Error("Failed to add meal");

      setOpen(false); 
      onMealAdded(); // Refresh the dashboard
      
      // Clear the form for next time
      setName(""); setCalories(""); setProtein(""); setCarbs(""); setFats("");
    } catch (err) {
      alert("Error adding meal. Please check your inputs.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="w-full mt-4">+ Add Meal</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a Meal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Meal Name</Label>
            <Input id="name" placeholder="e.g. Koshary or Protein Shake" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="calories">Calories (kcal)</Label>
            <Input id="calories" type="number" value={calories} onChange={(e) => setCalories(e.target.value)} required />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="protein">Protein (g)</Label>
              <Input id="protein" type="number" step="0.1" value={protein} onChange={(e) => setProtein(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carbs">Carbs (g)</Label>
              <Input id="carbs" type="number" step="0.1" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fats">Fats (g)</Label>
              <Input id="fats" type="number" step="0.1" value={fats} onChange={(e) => setFats(e.target.value)} />
            </div>
          </div>
          <Button type="submit" className="w-full">Save Meal</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}