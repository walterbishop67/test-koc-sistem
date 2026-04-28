from __future__ import annotations

from fastapi import HTTPException, status

from backend.services.project_services.repository.project_repository import ProjectRepository


class ProjectService:
    def __init__(self, repo: ProjectRepository):
        self._repo = repo

    async def list_projects(self, user_id: str):
        return await self._repo.list_by_owner(user_id)

    async def create_project(self, title: str, description: str, owner_id: str):
        title = title.strip()
        if not title:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Proje adı boş olamaz.")
        return await self._repo.create(title, description, owner_id)

    async def update_project(self, project_id: str, title: str, description: str, user_id: str):
        owned = await self._repo.get_owned(project_id, user_id)
        if not owned:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Proje bulunamadı.")
        return await self._repo.update(project_id, title.strip(), description)

    async def delete_project(self, project_id: str, user_id: str):
        owned = await self._repo.get_owned(project_id, user_id)
        if not owned:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Proje bulunamadı.")
        await self._repo.delete(project_id)

    async def list_boards(self, project_id: str, user_id: str):
        owned = await self._repo.get_owned(project_id, user_id)
        if not owned:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Proje bulunamadı.")
        return await self._repo.list_boards(project_id)
