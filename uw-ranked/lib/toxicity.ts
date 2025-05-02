import { pipeline } from '@xenova/transformers';

// Cache for the classifier to avoid reloading
let classifier: any = null;
let isInitializing = false;
let initializationError: Error | null = null;

// Initialize the classifier with retries
async function initializeClassifier() {
  if (classifier) return classifier;
  if (isInitializing) {
    // Wait for initialization to complete
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (initializationError) throw initializationError;
    return classifier;
  }

  isInitializing = true;
  initializationError = null;

  try {
    // Using a smaller, more reliable model
    classifier = await pipeline(
      'text-classification',
      'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
      {
        quantized: true, // Use quantized model for better performance
        progress_callback: (progress: any) => {
          console.log('Model loading progress:', progress);
        }
      }
    );
    return classifier;
  } catch (error) {
    initializationError = error as Error;
    throw error;
  } finally {
    isInitializing = false;
  }
}

export async function analyzeComment(comment: string): Promise<number> {
  try {
    const classifier = await initializeClassifier();
    const result = await classifier(comment, {
      topk: 1,
      max_length: 512 // Limit input length for better performance
    });
    
    // Convert sentiment to toxicity score
    // Negative sentiment is considered more toxic
    const isNegative = result[0].label === 'NEGATIVE';
    return isNegative ? result[0].score : 1 - result[0].score;
  } catch (error) {
    console.error('Error analyzing comment:', error);
    return 0.5; // Return neutral score on error
  }
}

export async function analyzeComments(comments: { text: string; videoId: string }[]) {
  try {
    // Initialize classifier before processing comments
    await initializeClassifier();
    
    const results = await Promise.all(
      comments.map(async (comment) => {
        try {
          const score = await analyzeComment(comment.text);
          return {
            ...comment,
            toxicityScore: score,
          };
        } catch (error) {
          console.error('Error processing comment:', error);
          return {
            ...comment,
            toxicityScore: 0.5, // Neutral score for failed analysis
          };
        }
      })
    );

    return results;
  } catch (error) {
    console.error('Error in analyzeComments:', error);
    throw new Error('Failed to analyze comments');
  }
}

export function aggregateResults(analyzedComments: { videoId: string; toxicityScore: number }[]) {
  try {
    const videoStats = new Map<string, { totalScore: number; count: number }>();

    analyzedComments.forEach((comment) => {
      const current = videoStats.get(comment.videoId) || { totalScore: 0, count: 0 };
      videoStats.set(comment.videoId, {
        totalScore: current.totalScore + comment.toxicityScore,
        count: current.count + 1,
      });
    });

    return Array.from(videoStats.entries()).map(([videoId, stats]) => ({
      videoId,
      toxicity_avg: stats.totalScore / stats.count,
      toxic_comment_pct: (analyzedComments
        .filter(c => c.videoId === videoId && c.toxicityScore > 0.5)
        .length / stats.count) * 100,
      comments_analyzed: stats.count,
    }));
  } catch (error) {
    console.error('Error aggregating results:', error);
    throw new Error('Failed to aggregate results');
  }
} 