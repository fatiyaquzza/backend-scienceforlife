const pool = require('../config/database');

const getQuestionsBySubModule = async (req, res) => {
  try {
    const { subModuleId, type } = req.params;

    if (!['pretest', 'postest'].includes(type)) {
      return res.status(400).json({ message: 'Invalid question type' });
    }

    const [questions] = await pool.execute(
      'SELECT * FROM questions WHERE sub_module_id = ? AND type = ? ORDER BY created_at ASC',
      [subModuleId, type]
    );

    // Get options for choice questions
    for (let question of questions) {
      if (question.question_type === 'choice') {
        const [options] = await pool.execute(
          'SELECT * FROM question_options WHERE question_id = ? ORDER BY option_label ASC',
          [question.id]
        );
        question.options = options;
      }
    }

    res.json({ questions });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createQuestion = async (req, res) => {
  try {
    const { sub_module_id, type, question_type, question_text, correct_answer, options } = req.body;

    if (!sub_module_id || !type || !question_text || !correct_answer) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    if (!['pretest', 'postest'].includes(type)) {
      return res.status(400).json({ message: 'Invalid question type' });
    }

    // Force all questions to be multiple choice
    const finalQuestionType = 'choice';

    // Check if sub module exists
    const [subModules] = await pool.execute(
      'SELECT id FROM sub_modules WHERE id = ?',
      [sub_module_id]
    );

    if (subModules.length === 0) {
      return res.status(404).json({ message: 'Sub module not found' });
    }

    // Insert question
    const [result] = await pool.execute(
      'INSERT INTO questions (sub_module_id, type, question_type, question_text, correct_answer) VALUES (?, ?, ?, ?, ?)',
      [sub_module_id, type, finalQuestionType, question_text, correct_answer]
    );

    const questionId = result.insertId;

    // Insert options if choice type
    if (options && Array.isArray(options)) {
      // Only keep up to 4 options and ensure labels A-D
      const labels = ['A', 'B', 'C', 'D'];
      const normalized = options
        .slice(0, 4)
        .map((opt, idx) => ({
          label: labels[idx],
          text: opt.text
        }));

      for (const option of normalized) {
        await pool.execute(
          'INSERT INTO question_options (question_id, option_label, option_text) VALUES (?, ?, ?)',
          [questionId, option.label, option.text]
        );
      }
    }

    // Get created question with options
    const [newQuestion] = await pool.execute(
      'SELECT * FROM questions WHERE id = ?',
      [questionId]
    );

    const [questionOptions] = await pool.execute(
      'SELECT * FROM question_options WHERE question_id = ? ORDER BY option_label ASC',
      [questionId]
    );
    newQuestion[0].options = questionOptions;

    res.status(201).json({
      message: 'Question created successfully',
      question: newQuestion[0]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { question_text, correct_answer, options } = req.body;

    // Check if question exists
    const [questions] = await pool.execute(
      'SELECT * FROM questions WHERE id = ?',
      [id]
    );

    if (questions.length === 0) {
      return res.status(404).json({ message: 'Question not found' });
    }

    await pool.execute(
      'UPDATE questions SET question_text = ?, correct_answer = ? WHERE id = ?',
      [
        question_text || questions[0].question_text,
        correct_answer !== undefined ? correct_answer : questions[0].correct_answer,
        id
      ]
    );

    // Update options (all questions are multiple choice)
    if (options && Array.isArray(options)) {
      // Delete old options
      await pool.execute('DELETE FROM question_options WHERE question_id = ?', [id]);

      // Normalize to 4 options A-D
      const labels = ['A', 'B', 'C', 'D'];
      const normalized = options
        .slice(0, 4)
        .map((opt, idx) => ({
          label: labels[idx],
          text: opt.text
        }));

      for (const option of normalized) {
        await pool.execute(
          'INSERT INTO question_options (question_id, option_label, option_text) VALUES (?, ?, ?)',
          [id, option.label, option.text]
        );
      }
    }

    const [updatedQuestion] = await pool.execute(
      'SELECT * FROM questions WHERE id = ?',
      [id]
    );

    const [questionOptions] = await pool.execute(
      'SELECT * FROM question_options WHERE question_id = ? ORDER BY option_label ASC',
      [id]
    );
    updatedQuestion[0].options = questionOptions;

    res.json({
      message: 'Question updated successfully',
      question: updatedQuestion[0]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if question exists
    const [questions] = await pool.execute(
      'SELECT * FROM questions WHERE id = ?',
      [id]
    );

    if (questions.length === 0) {
      return res.status(404).json({ message: 'Question not found' });
    }

    await pool.execute('DELETE FROM questions WHERE id = ?', [id]);

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const submitAnswers = async (req, res) => {
  try {
    const { sub_module_id, test_type, answers } = req.body;
    const userId = req.user.id;

    if (!sub_module_id || !test_type || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Invalid request data' });
    }

    if (!['pretest', 'postest'].includes(test_type)) {
      return res.status(400).json({ message: 'Invalid test type' });
    }

    let correctCount = 0;
    let totalQuestions = 0;

    const details = [];

    // Process each answer
    for (const answer of answers) {
      const { question_id, user_answer } = answer;

      // Get question
      const [questions] = await pool.execute(
        'SELECT * FROM questions WHERE id = ? AND sub_module_id = ? AND type = ?',
        [question_id, sub_module_id, test_type]
      );

      if (questions.length === 0) continue;

      const question = questions[0];
      totalQuestions++;

      let isCorrect = false;

      // All questions are multiple choice
      isCorrect = user_answer?.toUpperCase().trim() === question.correct_answer?.toUpperCase().trim();

      if (isCorrect) correctCount++;

      // Save answer
      await pool.execute(
        'INSERT INTO user_answers (user_id, question_id, test_type, user_answer, is_correct) VALUES (?, ?, ?, ?, ?)',
        [userId, question_id, test_type, user_answer, isCorrect]
      );

      // Load options for review
      const [options] = await pool.execute(
        'SELECT option_label, option_text FROM question_options WHERE question_id = ? ORDER BY option_label ASC',
        [question_id]
      );

      details.push({
        question_id,
        question_text: question.question_text,
        options,
        user_answer,
        correct_answer: question.correct_answer,
        is_correct: isCorrect
      });
    }

    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // Update or create user progress
    const [existingProgress] = await pool.execute(
      'SELECT * FROM user_progress WHERE user_id = ? AND sub_module_id = ?',
      [userId, sub_module_id]
    );

    if (existingProgress.length > 0) {
      if (test_type === 'pretest') {
        await pool.execute(
          'UPDATE user_progress SET pretest_done = TRUE, pretest_score = ? WHERE user_id = ? AND sub_module_id = ?',
          [score, userId, sub_module_id]
        );
      } else {
        // Get passing grade
        const [subModules] = await pool.execute(
          'SELECT passing_grade FROM sub_modules WHERE id = ?',
          [sub_module_id]
        );
        const passingGrade = subModules[0]?.passing_grade || 70;
        const isPassed = score >= passingGrade;

        await pool.execute(
          'UPDATE user_progress SET postest_done = TRUE, postest_score = ?, is_passed = ? WHERE user_id = ? AND sub_module_id = ?',
          [score, isPassed, userId, sub_module_id]
        );
      }
    } else {
      const [subModules] = await pool.execute(
        'SELECT passing_grade FROM sub_modules WHERE id = ?',
        [sub_module_id]
      );
      const passingGrade = subModules[0]?.passing_grade || 70;
      const isPassed = test_type === 'postest' ? score >= passingGrade : false;

      await pool.execute(
        'INSERT INTO user_progress (user_id, sub_module_id, pretest_done, pretest_score, postest_done, postest_score, is_passed) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          userId,
          sub_module_id,
          test_type === 'pretest',
          test_type === 'pretest' ? score : 0,
          test_type === 'postest',
          test_type === 'postest' ? score : 0,
          isPassed
        ]
      );
    }

    if (test_type === 'pretest') {
      // Untuk pretest, tidak perlu mengirim detail ke user (nilai disimpan di database saja)
      return res.json({
        message: 'Pretest submitted successfully'
      });
    } else {
      // Untuk postest, kirimkan detail untuk review hasil
      return res.json({
        message: 'Postest submitted successfully',
        score,
        correctCount,
        totalQuestions,
        details
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getQuestionsBySubModule,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  submitAnswers
};
