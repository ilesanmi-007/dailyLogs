"use client";

import { useState } from "react";
import { CATEGORIES, addActivity, getToday, formatDate } from "@/lib/store";

interface Props {
  onAdd: () => void;
  defaultDate?: string;
}

export default function AddActivity({ onAdd, defaultDate }: Props) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].name);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(defaultDate || getToday());

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim().toLowerCase())) {
        setTags([...tags, tagInput.trim().toLowerCase()]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    // Build a timestamp for the selected date (use current time)
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const mins = now.getMinutes().toString().padStart(2, "0");
    const secs = now.getSeconds().toString().padStart(2, "0");
    const timestamp = `${selectedDate}T${hours}:${mins}:${secs}`;

    await addActivity({
      text: text.trim(),
      category,
      tags,
      timestamp: new Date(timestamp).toISOString(),
      date: selectedDate,
      completed: false,
      skipped: false,
    });

    setText("");
    setTags([]);
    setTagInput("");
    setIsOpen(false);
    setSelectedDate(defaultDate || getToday());
    onAdd();
  };

  const isToday = selectedDate === getToday();
  const selectedCat = CATEGORIES.find((c) => c.name === category)!;

  // Quick date shortcuts
  const quickDates = [
    { label: "Today", value: getToday() },
    {
      label: "Yesterday",
      value: new Date(Date.now() - 86400000).toISOString().split("T")[0],
    },
    {
      label: "2 days ago",
      value: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
    },
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="add-button"
      >
        <span className="add-icon">+</span>
        <span>Log an activity</span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="add-form">
      <div className="form-header">
        <h3>What did you do?</h3>
        <button type="button" onClick={() => setIsOpen(false)} className="close-btn">
          ✕
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Describe your activity..."
        className="activity-input"
        autoFocus
        rows={3}
      />

      {/* Date Picker */}
      <div className="form-section">
        <label className="form-label">When</label>
        <div className="date-picker-row">
          {quickDates.map((qd) => (
            <button
              key={qd.value}
              type="button"
              onClick={() => setSelectedDate(qd.value)}
              className={`date-quick-btn ${selectedDate === qd.value ? "active" : ""}`}
            >
              {qd.label}
            </button>
          ))}
          <label className={`date-custom-btn ${!quickDates.some((q) => q.value === selectedDate) ? "active" : ""}`}>
            <span>Pick date</span>
            <input
              type="date"
              value={selectedDate}
              max={getToday()}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="date-input-hidden"
            />
          </label>
        </div>
        {!isToday && (
          <p className="date-notice">
            Logging for: <strong>{formatDate(selectedDate)}</strong>
          </p>
        )}
      </div>

      <div className="form-section">
        <label className="form-label">Category</label>
        <div className="category-grid">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              type="button"
              onClick={() => setCategory(cat.name)}
              className={`category-chip ${category === cat.name ? "active" : ""}`}
              style={{
                borderColor: category === cat.name ? cat.color : "transparent",
                backgroundColor: category === cat.name ? cat.color + "18" : undefined,
              }}
            >
              <span>{cat.emoji}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="form-section">
        <label className="form-label">Tags</label>
        <div className="tags-container">
          {tags.map((tag) => (
            <span key={tag} className="tag" style={{ backgroundColor: selectedCat.color + "20", color: selectedCat.color }}>
              #{tag}
              <button type="button" onClick={() => removeTag(tag)} className="tag-remove">×</button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            placeholder={tags.length === 0 ? "Add tags (press Enter)" : "Add more..."}
            className="tag-input"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={!text.trim()}
        className="submit-btn"
        style={{ backgroundColor: selectedCat.color }}
      >
        {isToday ? "Log Activity" : `Log for ${formatDate(selectedDate)}`}
      </button>
    </form>
  );
}
