// ============================================================
//  WIDGET: Tareas — tabla `tasks` en el Supabase compartido
//  (creada para Mi Día; RLS auth.uid() = user_id, mismo patrón
//  que kratos). CRUD: agregar, marcar hecha, borrar.
// ============================================================
(() => {

  async function addTask(texto) {
    const { error } = await Core.sb().from("tasks").insert({ user_id: Core.uid(), texto });
    if (error) throw error;
  }
  async function toggleTask(id, done) {
    const { error } = await Core.sb().from("tasks").update({ done }).eq("id", id).eq("user_id", Core.uid());
    if (error) throw error;
  }
  async function delTask(id) {
    const { error } = await Core.sb().from("tasks").delete().eq("id", id).eq("user_id", Core.uid());
    if (error) throw error;
  }

  // Handlers globales (los usa el HTML generado)
  window.MiDiaTareas = {
    async add() {
      const inp = document.getElementById("task-new");
      const txt = (inp?.value || "").trim();
      if (!txt) return;
      inp.value = "";
      try { await addTask(txt); } catch (e) { console.warn(e); }
      Core.refreshOne("tareas");
    },
    async toggle(id, done) {
      try { await toggleTask(id, done); } catch (e) { console.warn(e); }
      Core.refreshOne("tareas");
    },
    async del(id) {
      try { await delTask(id); } catch (e) { console.warn(e); }
      Core.refreshOne("tareas");
    }
  };

  Core.register({
    id: "tareas",
    needsAuth: true,
    async load() {
      const { data, error } = await Core.sb().from("tasks")
        .select("id,texto,done,due,created_at")
        .eq("user_id", Core.uid())
        .order("done").order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return { tasks: data || [] };
    },
    render(el, d) {
      const pend = d.tasks.filter(t => !t.done), hechas = d.tasks.filter(t => t.done);
      const item = t => `
        <div class="list-item${t.done ? " done" : ""}">
          <input type="checkbox" ${t.done ? "checked" : ""}
            onchange="MiDiaTareas.toggle('${t.id}', this.checked)">
          <span class="grow">${Core.esc(t.texto)}</span>
          <button class="task-del" title="Borrar" onclick="MiDiaTareas.del('${t.id}')">✕</button>
        </div>`;
      el.innerHTML = `
        <div class="task-add">
          <input id="task-new" type="text" placeholder="Nueva tarea…"
            onkeydown="if(event.key==='Enter')MiDiaTareas.add()">
          <button class="btn-sm" onclick="MiDiaTareas.add()">＋</button>
        </div>
        ${pend.length ? `<div class="list">${pend.map(item).join("")}</div>`
                      : `<div class="w-msg">Sin pendientes. 🎉</div>`}
        ${hechas.length ? `<details><summary class="small muted">${hechas.length} completada${hechas.length > 1 ? "s" : ""}</summary>
          <div class="list" style="margin-top:6px">${hechas.slice(0, 8).map(item).join("")}</div></details>` : ""}`;
    }
  });
})();
