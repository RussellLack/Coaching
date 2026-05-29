import type {
  AnswerValue,
  PointAllocationFactor,
  Question,
} from '@/types/assessment'
import { Agreement5QuestionRenderer } from './Agreement5Question'
import { Slider010QuestionRenderer } from './Slider010Question'
import { PersonRowEntryQuestionRenderer } from './PersonRowEntryQuestion'
import { ScenarioRadioQuestionRenderer } from './ScenarioRadioQuestion'
import { PointAllocationQuestionRenderer } from './PointAllocationQuestion'

export interface QuestionRendererProps {
  question: Question
  questionNumber: number
  value: AnswerValue | undefined
  onChange: (value: AnswerValue) => void
  // Only used by the PointAllocation renderer. Optional because the other
  // renderers don't need it. The orchestrator passes it through whenever
  // the assessment declares pointAllocationFactors.
  pointAllocationFactors?: PointAllocationFactor[]
}

export function QuestionRenderer({
  question,
  questionNumber,
  value,
  onChange,
  pointAllocationFactors,
}: QuestionRendererProps) {
  switch (question._type) {
    case 'questionAgreement5':
      return (
        <Agreement5QuestionRenderer
          question={question}
          questionNumber={questionNumber}
          value={value as number | undefined}
          onChange={onChange as (v: number) => void}
        />
      )

    case 'questionSlider010':
      return (
        <Slider010QuestionRenderer
          question={question}
          questionNumber={questionNumber}
          value={value as number | undefined}
          onChange={onChange as (v: number) => void}
        />
      )

    case 'questionScenarioRadio':
      return (
        <ScenarioRadioQuestionRenderer
          question={question}
          questionNumber={questionNumber}
          value={value as string | undefined}
          onChange={onChange as (v: string) => void}
        />
      )

    case 'questionPersonRowEntry':
      return (
        <PersonRowEntryQuestionRenderer
          question={question}
          questionNumber={questionNumber}
          value={value as import('@/types/assessment').PersonRowEntryAnswer | undefined}
          onChange={
            onChange as (
              v: import('@/types/assessment').PersonRowEntryAnswer
            ) => void
          }
        />
      )

    case 'questionPointAllocation':
      // Factors must be supplied by the orchestrator. If not present, the
      // assessment was misauthored — render an authoring error rather than
      // crashing.
      if (
        !pointAllocationFactors ||
        pointAllocationFactors.length === 0
      ) {
        return (
          <div className="rounded-sm border border-dashed border-coral/40 bg-coral/10 p-4 text-sm text-cream">
            Authoring error: this assessment has a point-allocation question
            but no pointAllocationFactors declared. Add factors to the
            assessment document.
          </div>
        )
      }
      return (
        <PointAllocationQuestionRenderer
          question={question}
          questionNumber={questionNumber}
          value={
            value as
              | import('@/types/assessment').PointAllocationAnswer
              | undefined
          }
          onChange={
            onChange as (
              v: import('@/types/assessment').PointAllocationAnswer
            ) => void
          }
          factors={pointAllocationFactors}
        />
      )

    default: {
      const _exhaustive: never = question
      return null
    }
  }
}
