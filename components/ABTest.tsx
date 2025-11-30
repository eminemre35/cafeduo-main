import React, { useState, useEffect } from 'react';

interface ABTestProps {
    testName: string;
    variantA: React.ReactNode;
    variantB: React.ReactNode;
}

export const ABTest: React.FC<ABTestProps> = ({ testName, variantA, variantB }) => {
    const [variant, setVariant] = useState<'A' | 'B' | null>(null);

    useEffect(() => {
        // Check local storage
        const storedVariant = localStorage.getItem(`ab_test_${testName}`);

        if (storedVariant === 'A' || storedVariant === 'B') {
            setVariant(storedVariant);
        } else {
            // Randomly assign
            const newVariant = Math.random() > 0.5 ? 'A' : 'B';
            localStorage.setItem(`ab_test_${testName}`, newVariant);
            setVariant(newVariant);

            // Log exposure (In real app, send to analytics)
            console.log(`📊 A/B Test Exposure: ${testName} -> Variant ${newVariant}`);
        }
    }, [testName]);

    if (!variant) return null; // or loading spinner

    return <>{variant === 'A' ? variantA : variantB}</>;
};
