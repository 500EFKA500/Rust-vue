<script setup lang="ts">

import UserSwitcher from "./UserSwitcher.vue";

import type { User } from "../types/user";

// defineProps - спец конструкция vue, которая сообщает:
// Этот компонент ожидает получения данных от родительского компонента

defineProps<{
  status: string;
  users: User[];
  currentUser: User;
}>();

const emit = defineEmits<{
  select: [user: User];
  profile: [];
}>();

function selectUser(user: User){
  emit("select", user);
}
</script>

<template>
  <header class="header">
    <div>
      <h1>Encore 67 messenger</h1>

      <p>{{status}}</p>
    </div>

    <div class="header__actions">
      <UserSwitcher
          :users="users"
          :current-user-id="currentUser.id"
          @select="selectUser"
      />
      <button
          type="button"
          class="profile-open-button"
          @click="emit('profile')"
      >
        Профиль
      </button>
    </div>
    <span class="badge">
        Локально
      </span>
  </header>
</template>

<style scoped>
/*
  CSS этого блока будет относиться только к текущему vue компоненту
  Например .header не повлияет на любой другой .header в коде вне этого компонента
*/

.header{
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid #292c34;
  background: #17191f;
  /* Управляет тем, может ли flex уменьшать элемент*/
  flex-shrink: 0;
}

.header__actions{
  display: flex;
  align-items: center;
  gap: 12px;
}

.header h1 {
  margin: 0;
  font-size: 18px;
}

.header p{
  margin: 4px 0 0;
  color: #8f96a3;
}

.badge{
  padding: 6px 10px;
  border: 1px solid #343842;
  border-radius: 6px;
  color: #afb5c0;
  background: #20232a;
  font-size: 12px;
}

</style>