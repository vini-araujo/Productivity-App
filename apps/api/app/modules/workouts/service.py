"""Business logic for workout plans and logged sessions."""

from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.auth import AuthenticatedUser
from app.modules.workouts.models import (
    Exercise,
    WorkoutPlan,
    WorkoutPlanDay,
    WorkoutPlanExercise,
    WorkoutSession,
    WorkoutSet,
)
from app.modules.workouts.repository import WorkoutRepository
from app.modules.workouts.schemas import (
    ExerciseCreate,
    ExerciseResponse,
    PlanDayResponse,
    PlanExerciseResponse,
    WorkoutPlanCreate,
    WorkoutPlanResponse,
    WorkoutSessionResponse,
    WorkoutSessionUpdate,
    WorkoutSetResponse,
    WorkoutSetUpdate,
)


class WorkoutService:
    """Manage workout plans and user-owned session logging."""

    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = WorkoutRepository(session)

    def list_exercises(self, user: AuthenticatedUser) -> list[ExerciseResponse]:
        return [
            ExerciseResponse(
                id=exercise.id,
                name=exercise.name,
                muscle_group=exercise.muscle_group,
                is_builtin=exercise.user_id is None,
            )
            for exercise in self.repository.list_exercises(user.user_id)
        ]

    def create_exercise(
        self, user: AuthenticatedUser, data: ExerciseCreate
    ) -> ExerciseResponse:
        exercise = Exercise(user_id=user.user_id, **data.model_dump())
        self.repository.add(exercise)
        self._commit(exercise)
        return ExerciseResponse(
            id=exercise.id,
            name=exercise.name,
            muscle_group=exercise.muscle_group,
            is_builtin=False,
        )

    def list_plans(self, user: AuthenticatedUser) -> list[WorkoutPlanResponse]:
        return [
            self._plan_response(plan)
            for plan in self.repository.list_plans(user.user_id)
        ]

    def create_plan(
        self, user: AuthenticatedUser, data: WorkoutPlanCreate
    ) -> WorkoutPlanResponse:
        self._validate_exercises(user.user_id, data)
        plan = WorkoutPlan(
            user_id=user.user_id,
            name=data.name,
            description=data.description,
        )
        self.repository.add(plan)
        self.session.flush()
        self._add_plan_days(plan.id, data)
        self._commit(plan)
        return self._plan_response(plan)

    def update_plan(
        self,
        user: AuthenticatedUser,
        plan_id: UUID,
        data: WorkoutPlanCreate,
    ) -> WorkoutPlanResponse:
        plan = self.repository.get_owned_plan(plan_id, user.user_id)
        if plan is None:
            raise HTTPException(status_code=404, detail="Workout plan not found")
        self._validate_exercises(user.user_id, data)
        plan.name = data.name
        plan.description = data.description
        self.repository.delete_plan_days(plan.id)
        self.session.flush()
        self._add_plan_days(plan.id, data)
        self._commit(plan)
        return self._plan_response(plan)

    def clone_plan(self, user: AuthenticatedUser, plan_id: UUID) -> WorkoutPlanResponse:
        source = self._get_visible_plan(user, plan_id)
        data = WorkoutPlanCreate(
            name=f"{source.name} Copy",
            description=source.description,
            days=[
                {
                    "name": day.name,
                    "is_rest_day": day.is_rest_day,
                    "exercises": [
                        {
                            "exercise_id": exercise.exercise_id,
                            "target_sets": exercise.target_sets,
                            "target_to_failure": exercise.target_to_failure,
                        }
                        for exercise, _ in self.repository.list_plan_exercises(day.id)
                    ],
                }
                for day in self.repository.list_plan_days(source.id)
            ],
        )
        return self.create_plan(user, data)

    def start_session(
        self, user: AuthenticatedUser, plan_id: UUID, day_id: UUID
    ) -> WorkoutSessionResponse:
        if self.repository.get_active_session(user.user_id) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Complete the active workout before starting another",
            )
        plan = self._get_visible_plan(user, plan_id)
        day = self.repository.get_plan_day(day_id, plan.id)
        if day is None:
            raise HTTPException(status_code=404, detail="Workout plan day not found")
        if day.is_rest_day:
            raise HTTPException(status_code=409, detail="Rest days cannot be started")

        session = WorkoutSession(
            user_id=user.user_id,
            workout_plan_id=plan.id,
            workout_plan_day_id=day.id,
            name=day.name,
        )
        self.repository.add(session)
        self.session.flush()
        for exercise, exercise_name in self.repository.list_plan_exercises(day.id):
            for set_position in range(exercise.target_sets):
                self.repository.add(
                    WorkoutSet(
                        workout_session_id=session.id,
                        exercise_id=exercise.exercise_id,
                        exercise_name=exercise_name,
                        exercise_position=exercise.position,
                        position=set_position,
                        target_to_failure=exercise.target_to_failure,
                    )
                )
        try:
            self._commit(session)
        except IntegrityError as exc:
            self.session.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Complete the active workout before starting another",
            ) from exc
        return self._session_response(session)

    def list_sessions(
        self, user: AuthenticatedUser, limit: int
    ) -> list[WorkoutSessionResponse]:
        return [
            self._session_response(session)
            for session in self.repository.list_owned_sessions(user.user_id, limit)
        ]

    def get_session(
        self, user: AuthenticatedUser, session_id: UUID
    ) -> WorkoutSessionResponse:
        return self._session_response(self._get_owned_session(user, session_id))

    def update_session(
        self,
        user: AuthenticatedUser,
        session_id: UUID,
        data: WorkoutSessionUpdate,
    ) -> WorkoutSessionResponse:
        session = self._get_owned_session(user, session_id)
        values = data.model_dump(exclude_unset=True)
        completed = values.pop("completed", None)
        for field, value in values.items():
            setattr(session, field, value)
        if completed is True and session.completed_at is None:
            session.completed_at = datetime.now(UTC)
        elif completed is False:
            active = self.repository.get_active_session(user.user_id)
            if active is not None and active.id != session.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Complete the active workout before reopening another",
                )
            session.completed_at = None
        try:
            self._commit(session)
        except IntegrityError as exc:
            self.session.rollback()
            if completed is False:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Complete the active workout before reopening another",
                ) from exc
            raise
        return self._session_response(session)

    def update_set(
        self, user: AuthenticatedUser, set_id: UUID, data: WorkoutSetUpdate
    ) -> WorkoutSetResponse:
        workout_set = self.repository.get_owned_set(set_id, user.user_id)
        if workout_set is None:
            raise HTTPException(status_code=404, detail="Workout set not found")
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(workout_set, field, value)
        self._commit(workout_set)
        return WorkoutSetResponse.model_validate(workout_set)

    def delete_session(self, user: AuthenticatedUser, session_id: UUID) -> None:
        session = self._get_owned_session(user, session_id)
        self.repository.delete_session(session)
        self.session.commit()

    def _validate_exercises(self, user_id: UUID, data: WorkoutPlanCreate) -> None:
        exercise_ids = {
            exercise.exercise_id for day in data.days for exercise in day.exercises
        }
        visible = self.repository.get_visible_exercises(exercise_ids, user_id)
        if len(visible) != len(exercise_ids):
            raise HTTPException(status_code=404, detail="Exercise not found")

    def _add_plan_days(self, plan_id: UUID, data: WorkoutPlanCreate) -> None:
        for day_position, day_data in enumerate(data.days):
            day = WorkoutPlanDay(
                workout_plan_id=plan_id,
                name=day_data.name,
                position=day_position,
                is_rest_day=day_data.is_rest_day,
            )
            self.repository.add(day)
            self.session.flush()
            for exercise_position, exercise_data in enumerate(day_data.exercises):
                self.repository.add(
                    WorkoutPlanExercise(
                        workout_plan_day_id=day.id,
                        exercise_id=exercise_data.exercise_id,
                        position=exercise_position,
                        target_sets=exercise_data.target_sets,
                        target_to_failure=exercise_data.target_to_failure,
                    )
                )

    def _get_visible_plan(self, user: AuthenticatedUser, plan_id: UUID) -> WorkoutPlan:
        plan = self.repository.get_visible_plan(plan_id, user.user_id)
        if plan is None:
            raise HTTPException(status_code=404, detail="Workout plan not found")
        return plan

    def _get_owned_session(
        self, user: AuthenticatedUser, session_id: UUID
    ) -> WorkoutSession:
        session = self.repository.get_owned_session(session_id, user.user_id)
        if session is None:
            raise HTTPException(status_code=404, detail="Workout session not found")
        return session

    def _plan_response(self, plan: WorkoutPlan) -> WorkoutPlanResponse:
        def exercise_responses(day_id: UUID) -> list[PlanExerciseResponse]:
            return [
                PlanExerciseResponse(
                    id=exercise.id,
                    exercise_id=exercise.exercise_id,
                    exercise_name=exercise_name,
                    position=exercise.position,
                    target_sets=exercise.target_sets,
                    target_to_failure=exercise.target_to_failure,
                )
                for exercise, exercise_name in self.repository.list_plan_exercises(
                    day_id
                )
            ]

        return WorkoutPlanResponse(
            id=plan.id,
            name=plan.name,
            description=plan.description,
            is_builtin=plan.user_id is None,
            days=[
                PlanDayResponse(
                    id=day.id,
                    name=day.name,
                    position=day.position,
                    is_rest_day=day.is_rest_day,
                    exercises=exercise_responses(day.id),
                )
                for day in self.repository.list_plan_days(plan.id)
            ],
        )

    def _session_response(self, session: WorkoutSession) -> WorkoutSessionResponse:
        return WorkoutSessionResponse(
            id=session.id,
            workout_plan_id=session.workout_plan_id,
            workout_plan_day_id=session.workout_plan_day_id,
            name=session.name,
            notes=session.notes,
            started_at=session.started_at,
            completed_at=session.completed_at,
            sets=[
                WorkoutSetResponse.model_validate(workout_set)
                for workout_set in self.repository.list_session_sets(session.id)
            ],
        )

    def _commit(self, value: object) -> None:
        self.session.commit()
        self.session.refresh(value)
