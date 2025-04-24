import { useState } from "react";

type TagsInputProps = {
    tags: string[];
    setTags: (tags: string[]) => void;
    readOnly?: boolean;
};

export const TagsInput = ({ tags, setTags, readOnly = false }: TagsInputProps) => {
    const [input, setInput] = useState("");

    const [error, setError] = useState("");
    const isValidTag = (tag: string) => /^[a-zA-Z0-9-_]{1,15}$/.test(tag);

    const addTag = () => {
        const trimmed = input.trim();
        if (!isValidTag(trimmed)) {
            setError("Only letters, numbers, hyphens, and underscores allowed.");
            return;
        }
        if (tags.includes(trimmed)) {
            setError("Tag already added.");
            return;
        }
        if (tags.length >= 5) {
            setError("Maximum of 5 tags allowed.");
            return;
        }

        setTags([...tags, trimmed]);
        setInput("");
        setError("");
    };


    const removeTag = (index: number) => {
        if (readOnly) return;
        const updatedTags = tags.filter((_, i) => i !== index);
        setTags(updatedTags);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag();
        }
    };

    return (
        <div className="sm:col-span-3 max-w-md rounded-xl mt-4">
            <label className="block text-sm font-medium leading-6 text-gray-900">Tags (max 5)</label>
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
            <div className="mt-2">
                {tags.map((tag, index) => (
                    <span
                        key={index}
                        className="flex items-center gap-1 bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-sm"
                    >
                        {tag}
                        {!readOnly && (
                            <button
                                type="button"
                                onClick={() => removeTag(index)}
                                className="text-xs text-red-500 hover:text-red-700"
                            >
                                &times;
                            </button>
                        )}
                    </span>
                ))}
                {!readOnly && tags.length < 5 && (
                    <input
                        type="text"
                        //   
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        placeholder="Add tag"
                        value={input}
                        onChange={(e) => {
                            if (e.target.value.length <= 15) setInput(e.target.value);
                        }}
                        onKeyDown={handleKeyDown}
                    />
                )}
            </div>
        </div>
    );
};
