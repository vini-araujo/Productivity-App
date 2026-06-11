"""Persistence operations for workout plans and sessions."""

from uuid import UUID

from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session

from app.modules.workouts.models import (
    Exercise,
    WorkoutPlan,
    WorkoutPlanDay,
    WorkoutPlanExercise,
    WorkoutSession,
    WorkoutSet,
)


class WorkoutRepository:
    """Query workout data while enforcing visibility and ownership."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def list_exercises(self, user_id: UUID) -> list[Exercise]:
        return list(
            self.session.scalars(
                select(Exercise)
                .where(or_(Exercise.user_id.is_(None), Exercise.user_id == user_id))
                .order_by(Exercise.name.asc(), Exercise.id.asc())
            )
        )

    def get_visible_exercises(
        self, exercise_ids: set[UUID], user_id: UUID
    ) -> dict[UUID, Exercise]:
        exercises = self.session.scalars(
            select(Exercise).where(
                Exercise.id.in_(exercise_ids),
                or_(Exercise.user_id.is_(None), Exercise.user_id == user_id),
            )
        )
        return {exercise.id: exercise for exercise in exercises}

    def add(self, value: object) -> None:
        self.session.add(value)

    def list_plans(self, user_id: UUID) -> list[WorkoutPlan]:
        return list(
            self.session.scalars(
                select(WorkoutPlan)
                .where(
                    or_(WorkoutPlan.user_id.is_(None), WorkoutPlan.user_id == user_id)
                )
                .order_by(
                    WorkoutPlan.user_id.is_not(None).asc(), WorkoutPlan.name.asc()
                )
            )
        )

    def get_visible_plan(self, plan_id: UUID, user_id: UUID) -> WorkoutPlan | None:
        return self.session.scalar(
            select(WorkoutPlan).where(
                WorkoutPlan.id == plan_id,
                or_(WorkoutPlan.user_id.is_(None), WorkoutPlan.user_id == user_id),
            )
        )

    def get_owned_plan(self, plan_id: UUID, user_id: UUID) -> WorkoutPlan | None:
        return self.session.scalar(
            select(WorkoutPlan).where(
                WorkoutPlan.id == plan_id,
                WorkoutPlan.user_id == user_id,
            )
        )

    def delete_plan_days(self, plan_id: UUID) -> None:
        day_ids = select(WorkoutPlanDay.id).where(
            WorkoutPlanDay.workout_plan_id == plan_id
        )
        self.session.execute(
            delete(WorkoutPlanExercise).where(
                WorkoutPlanExercise.workout_plan_day_id.in_(day_ids)
            )
        )
        self.session.execute(
            delete(WorkoutPlanDay).where(WorkoutPlanDay.workout_plan_id == plan_id)
        )

    def list_plan_days(self, plan_id: UUID) -> list[WorkoutPlanDay]:
        return list(
            self.session.scalars(
                select(WorkoutPlanDay)
                .where(WorkoutPlanDay.workout_plan_id == plan_id)
                .order_by(WorkoutPlanDay.position.asc(), WorkoutPlanDay.id.asc())
            )
        )

    def list_plan_exercises(
        self, day_id: UUID
    ) -> list[tuple[WorkoutPlanExercise, str]]:
        return list(
            self.session.execute(
                select(WorkoutPlanExercise, Exercise.name)
                .join(Exercise, Exercise.id == WorkoutPlanExercise.exercise_id)
                .where(WorkoutPlanExercise.workout_plan_day_id == day_id)
                .order_by(
                    WorkoutPlanExercise.position.asc(), WorkoutPlanExercise.id.asc()
                )
            ).all()
        )

    def get_plan_day(self, day_id: UUID, plan_id: UUID) -> WorkoutPlanDay | None:
        return self.session.scalar(
            select(WorkoutPlanDay).where(
                WorkoutPlanDay.id == day_id,
                WorkoutPlanDay.workout_plan_id == plan_id,
            )
        )

    def get_active_session(self, user_id: UUID) -> WorkoutSession | None:
        return self.session.scalar(
            select(WorkoutSession).where(
                WorkoutSession.user_id == user_id,
                WorkoutSession.completed_at.is_(None),
            )
        )

    def get_owned_session(
        self, session_id: UUID, user_id: UUID
    ) -> WorkoutSession | None:
        return self.session.scalar(
            select(WorkoutSession).where(
                WorkoutSession.id == session_id,
                WorkoutSession.user_id == user_id,
            )
        )

    def list_owned_sessions(self, user_id: UUID, limit: int) -> list[WorkoutSession]:
        return list(
            self.session.scalars(
                select(WorkoutSession)
                .where(WorkoutSession.user_id == user_id)
                .order_by(WorkoutSession.started_at.desc(), WorkoutSession.id.desc())
                .limit(limit)
            )
        )

    def delete_session(self, session: WorkoutSession) -> None:
        self.session.delete(session)

    def get_owned_set(self, set_id: UUID, user_id: UUID) -> WorkoutSet | None:
        return self.session.scalar(
            select(WorkoutSet)
            .join(WorkoutSession, WorkoutSession.id == WorkoutSet.workout_session_id)
            .where(WorkoutSet.id == set_id, WorkoutSession.user_id == user_id)
        )

    def list_session_sets(self, session_id: UUID) -> list[WorkoutSet]:
        return list(
            self.session.scalars(
                select(WorkoutSet)
                .where(WorkoutSet.workout_session_id == session_id)
                .order_by(
                    WorkoutSet.exercise_position.asc(),
                    WorkoutSet.position.asc(),
                    WorkoutSet.id.asc(),
                )
            )
        )
