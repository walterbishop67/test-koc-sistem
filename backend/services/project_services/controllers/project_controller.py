from __future__ import annotations

from backend.services.project_services.services.project_service import ProjectService


class ProjectController:
    def __init__(self, svc: ProjectService):
        self._svc = svc

    async def list_projects(self, user_id: str):
        return await self._svc.list_projects(user_id)

    async def create_project(self, title: str, description: str, owner_id: str):
        return await self._svc.create_project(title, description, owner_id)

    async def update_project(self, project_id: str, title: str, description: str, user_id: str):
        return await self._svc.update_project(project_id, title, description, user_id)

    async def delete_project(self, project_id: str, user_id: str):
        await self._svc.delete_project(project_id, user_id)

    async def list_boards(self, project_id: str, user_id: str):
        return await self._svc.list_boards(project_id, user_id)
