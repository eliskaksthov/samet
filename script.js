function checkAnswer(correct, nextPage) {
  const input = document.getElementById('answer');
  const feedback = document.getElementById('feedback');
  const answer = input ? input.value.trim().toUpperCase() : '';
  const expected = correct.trim().toUpperCase();
  if(answer === expected) {
    if(nextPage) {
      window.location.href = nextPage;
    } else {
      feedback.textContent = 'Správně!';
      feedback.style.color = 'green';
    }
  } else {
    feedback.textContent = 'Špatně — zkus to znovu.';
    feedback.style.color = 'salmon';
  }
}